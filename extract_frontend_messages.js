var fs = require('fs');
var espree = require('espree');
var escodegen = require('escodegen');
var mkdirp = require('mkdirp');
var path = require('path');

function isFormatted(str) {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(str);
}

var logging = {
  error: function(message) {
    /* eslint-disable-next-line no-console */
    console.error(message);
  },
  warn: function(message) {
    /* eslint-disable-next-line no-console */
    console.warn(message);
  },
};

function readJSFromVue(text) {
  const start = text.indexOf('<script>') + 8;
  const end = text.indexOf('</script>');
  return text.slice(start, end);
}

function generateMessagesObject(messagesObject) {
  // define here and then let it be assigned during eval
  // AST node that can be used to generate the messages object once parsed from the module
  var messagesAST = {
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: {
        type: 'Identifier',
        name: 'messages',
      },
      right: messagesObject,
    },
  };
  return eval(escodegen.generate(messagesAST));
}

var i18nAlias = 'utils/i18n';

function extractMessages(files) {
  var messageExport = {};
  var nameSpaces = [];
  function registerFoundMessages(messageNameSpace, messages, file) {
    if (messageNameSpace) {
      // Warn about duplicate nameSpaces *within* a bundle (no way to warn across).
      if (Object.keys(messages).length) {
        // Check that the namespace is camelCase.
        if (!isFormatted(messageNameSpace)) {
          logging.error(`Name id "${messageNameSpace}" should be in camelCase. Found in ${file}`);
        }
        nameSpaces.push(messageNameSpace);
        Object.keys(messages).forEach(function(key) {
          // Every message needs to be namespaced - don't pollute our top level!
          // Create a new message id from the name space and the message id joined with '.'
          var msgId = messageNameSpace + '.' + key;
          // Save it onto our export object for the whole bundle.
          messageExport[msgId] = messages[key];
        });
      }
      // Someone defined a $trs object, but didn't namespace it
      //  - warn them about it here so they can fix their foolishness.
    } else if (Object.keys(messages).length) {
      logging.error(
        'Translatable messages have been defined in ' +
          file +
          ' but no messageNameSpace was specified.'
      );
    }
  }
  files.forEach(function(file) {
    // eslint-disable-next-line no-console
    console.log(`Processing ${file} for frontend messages`);
    if (file && file.indexOf('.vue') === file.length - 4) {
      // Inspect each source file in the chunk if it is a vue file.
      var messageNameSpace;
      var messages = {};
      // Parse the AST for the Vue file.
      var source = fs.readFileSync(file, { encoding: 'utf-8' });
      var jsSource = readJSFromVue(source);
      var ast = espree.parse(jsSource, {
        sourceType: 'module',
        ecmaVersion: 2018,
      });
      ast.body.forEach(function(node) {
        // Look through each top level node until we find the module.exports or export default
        // N.B. this relies on our convention of directly exporting the Vue component
        // with the module.exports or export default, rather than defining it
        // and then setting it to export.

        // Is it an expression?
        if (
          (node.type === 'ExpressionStatement' &&
            // Is it an assignment expression?
            node.expression.type === 'AssignmentExpression' &&
            // Is the first part of the assignment 'module'?
            ((node.expression.left || {}).object || {}).name == 'module' &&
            // Is it assining to the 'exports' property of 'module'?
            ((node.expression.left || {}).property || {}).name == 'exports' &&
            // Does the right hand side of the assignment expression have any properties?
            // (We don't want to both parsing it if it is an empty object)
            node.expression.right.properties) ||
          // Is it an export default declaration?
          (node.type === 'ExportDefaultDeclaration' &&
            // Is it an object expression?
            node.declaration.type === 'ObjectExpression')
        ) {
          const properties = node.declaration
            ? node.declaration.properties
            : node.expression.right.properties;
          // Look through each of the properties in the object that is being exported.
          properties.forEach(function(property) {
            // If the property is called $trs we have hit paydirt! Some messages for us to grab!
            if (property.key.name === '$trs') {
              // Grab every message in our $trs property and save it into our messages object.
              property.value.properties.forEach(function(message) {
                var msgId = message.key.name || message.key.value;
                // Check that the trs id is camelCase.
                if (!isFormatted(msgId)) {
                  logging.error(
                    `$trs id "${message.key.name}" should be in camelCase. Found in ${file}`
                  );
                }
                // Check that the value is valid, and not an expression
                if (!message.value.value) {
                  logging.error(
                    `The value for $trs "${message.key.name}", is not valid. Make sure it is not an expression. Found in ${file}.`
                  );
                } else {
                  messages[msgId] = message.value.value;
                }
              });
              // We also want to take a note of the name space these messages have been put in too!
            } else if (property.key.name === 'name') {
              messageNameSpace = property.value.value;
            }
          });
          registerFoundMessages(messageNameSpace, messages, file);
        }
      });
    } else if (file && file.indexOf('.js') === file.length - 3 && !file.includes('node_modules')) {
      // Inspect each source file in the chunk if it is a js file too.
      ast = espree.parse(fs.readFileSync(file, { encoding: 'utf-8' }), {
        sourceType: 'module',
        ecmaVersion: 2018,
      });
      var createTranslateFn;
      var createTranslateModule;
      // First find the reference being used for the create translator function
      // Caveat - this assumes you are only defining the createTranslator function once
      // If you define it more than once, the earlier definitions will be discarded.
      // It also assumes you are defining the function in the top scope of the module.
      ast.body.forEach(node => {
        // Check if an import
        if (
          node.type === espree.Syntax.VariableDeclaration &&
          node.declarations[0].init.type === espree.Syntax.MemberExpression &&
          node.declarations[0].init.object.type === espree.Syntax.CallExpression &&
          // We found a require statement with a chained property reference
          node.declarations[0].init.object.callee.name === 'require' &&
          // Check if requiring from the i18n module
          node.declarations[0].init.object.arguments[0].value.includes(i18nAlias) &&
          // Directly referencing the 'createTranslator' property off the i18n module
          node.declarations[0].init.property.name === 'createTranslator'
        ) {
          // So this variable declaration is defining the
          // createTranslator function inside this module
          // Set the name of the createTranslatorFn to this
          createTranslateFn = node.declarations[0].id.name;
        } else if (
          node.type === espree.Syntax.VariableDeclaration &&
          node.declarations[0].init.type === espree.Syntax.CallExpression &&
          // We found a standalone require statement
          node.declarations[0].init.callee.name === 'require' &&
          // Check if requiring from the i18n module
          node.declarations[0].init.arguments[0].value.includes(i18nAlias)
        ) {
          // The i18n module is instantiated as a variable first, so keep a reference to this
          // to find uses of the createTranslator function later.
          createTranslateModule = node.declarations[0].id.name;
        } else if (
          node.type === espree.Syntax.VariableDeclaration &&
          node.declarations[0].init.type === espree.Syntax.MemberExpression &&
          node.declarations[0].init.object.name === createTranslateModule &&
          node.declarations[0].init.property.name === 'createTranslator'
        ) {
          // Defining a variable as the 'createTranslator' property of the 'createTranslateModule'
          createTranslateFn = node.declarations[0].id.name;
        }
      });
      /* eslint-disable no-inner-declarations */
      function traverseTree(node, scopeChain) {
        function getVarScope(name) {
          return scopeChain.find(scope => typeof scope[name] !== 'undefined');
        }
        var varScope;
        if (
          node.type === espree.Syntax.FunctionDeclaration ||
          node.type === espree.Syntax.FunctionExpression ||
          node.type === espree.Syntax.Program
        ) {
          // These node types create a new scope
          scopeChain.unshift({});
        }
        var localScope = scopeChain[0];
        // New declarations only affect the local scope
        if (node.type === espree.Syntax.VariableDeclaration) {
          node.declarations.forEach(dec => {
            localScope[dec.id.name] = dec.init;
          });
        }
        // Check if is an expression
        if (
          node.type === espree.Syntax.ExpressionStatement &&
          // That assigns a value
          node.expression.type === espree.Syntax.AssignmentExpression &&
          // To a variable
          node.expression.left.type === espree.Syntax.Identifier &&
          // But only handle equality, because other kinds are difficult to track
          node.expression.operator === '='
        ) {
          // Find the relevant scope where the variable being assigned to is defined
          varScope = getVarScope(node.expression.left.name);
          if (varScope) {
            varScope[node.expression.left.name] = node.expression.right;
          }
        }
        if (
          // Either invoking the createTranslator with its assigned variable name
          // or invoking it directly off the module
          node.type === espree.Syntax.CallExpression &&
          ((createTranslateFn && node.callee.name === createTranslateFn) ||
            (createTranslateModule &&
              node.callee.type === espree.Syntax.MemberExpression &&
              node.callee.object.name === createTranslateModule &&
              node.callee.property.name === 'createTranslator'))
        ) {
          var messageNameSpace, messages;
          var firstArg = node.arguments[0];
          if (firstArg.type === espree.Syntax.Literal) {
            // First argument is a string, get its value directly
            messageNameSpace = firstArg.value;
          } else if (firstArg.type === espree.Syntax.Identifier) {
            // First argument is a variable, lookup in the appropriate scope
            varScope = getVarScope(firstArg.name);
            if (varScope) {
              messageNameSpace = varScope[firstArg.name].value;
            } else {
              logging.warn(
                `Translator object called with undefined name space argument in ${file}`
              );
            }
          }
          var secondArg = node.arguments[1];
          if (secondArg.type === espree.Syntax.ObjectExpression) {
            // Second argument is an object, parse this chunk of the AST to get an object back
            messages = generateMessagesObject(secondArg);
          } else if (secondArg.type === espree.Syntax.Identifier) {
            // Second argument is a variable, lookup in the appropriate scope
            varScope = getVarScope(secondArg.name);
            if (varScope) {
              messages = generateMessagesObject(varScope[secondArg.name]);
            } else {
              logging.warn(`Translator object called with undefined messages argument in ${file}`);
            }
          }
          registerFoundMessages(messageNameSpace, messages, file);
        }
        if (
          node.init &&
          node.init.type === espree.Syntax.CallExpression &&
          node.init.callee.property &&
          node.init.callee.property.name === 'extend'
        ) {
          // Found a use of the extend method, try to find potential backbone messages
          if (node.init.arguments[0].properties) {
            node.init.arguments[0].properties.forEach(function(property) {
              if (property.key.name === '$trs') {
                // Grab every message in our $trs property and save it into our messages object.
                if (property.value.type === espree.Syntax.ObjectExpression) {
                  // property is an object, parse this chunk of the AST to get an object back
                  messages = generateMessagesObject(property.value);
                } else if (property.value.type === espree.Syntax.Identifier) {
                  // property is a variable, lookup in the appropriate scope
                  varScope = getVarScope(property.value.name);
                  if (varScope) {
                    messages = generateMessagesObject(varScope[property.value.name]);
                  } else {
                    logging.warn(
                      `$trs key on Backbone view with undefined value argument in ${file}`
                    );
                  }
                }
              }
              // We also want to take a note of the name space these messages have been put in too!
              else if (property.key.name === 'name') {
                if (property.value.type === espree.Syntax.Literal) {
                  messageNameSpace = property.value.value;
                } else if (property.value.type === espree.Syntax.Identifier) {
                  // property is a variable, lookup in the appropriate scope
                  varScope = getVarScope(property.value.name);
                  if (varScope) {
                    messageNameSpace = varScope[property.value.name].value;
                  } else {
                    logging.warn(`name key on Backbone view with undefined value in ${file}`);
                  }
                }
              }
            });
          }
          if (messages) {
            registerFoundMessages(messageNameSpace, messages, file);
          }
        }
        for (var key in node) {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            var child = node[key];
            if (typeof child === 'object' && child !== null) {
              if (Array.isArray(child)) {
                child.forEach(function(node) {
                  traverseTree(node, scopeChain);
                });
              } else {
                traverseTree(child, scopeChain);
              }
            }
          }
        }
        if (
          node.type === espree.Syntax.FunctionDeclaration ||
          node.type === espree.Syntax.FunctionExpression ||
          node.type === espree.Syntax.Program
        ) {
          // Leaving this scope now!
          scopeChain.shift();
        }
      }
      /* eslint-enable no-inner-declarations */
      traverseTree(ast, []);
    }
  });
  return messageExport;
}

if (require.main === module) {
  const program = require('commander');
  const glob = require('glob');

  program
    .version('0.0.1')
    .usage('[options] <files...>')
    .arguments('<files...>')
    .parse(process.argv);
  var files = program.args;
  if (!files.length) {
    program.help();
  } else {
    // Run glob on any files argument passed in to get array of all files back
    files = files.reduce((acc, file) => acc.concat(glob.sync(file)), []);
    var messages = extractMessages(files);
    var messageDir = path.join('contentcuration', 'locale', 'en', 'LC_FRONTEND_MESSAGES');
    // Make sure the directory we are using exists.
    mkdirp.sync(messageDir);
    // eslint-disable-next-line no-console
    console.log(`${Object.keys(messages).length} messages found, writing to disk`);
    // Write out the data to JSON.
    fs.writeFileSync(
      path.join(messageDir, 'contentcuration-messages.json'),
      JSON.stringify(messages)
    );
  }
}
