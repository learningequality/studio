var _ = require('underscore');
var globalMessageStore = require("utils/translations");

function createTranslator(nameSpace, defaultMessages) {
  function translate(constant_id){
    var messages = _.extend(defaultMessages, globalMessageStore[nameSpace] || {});
    return messages[constant_id];
  }
  return translate;
}

module.exports = {
  createTranslator: createTranslator
};
