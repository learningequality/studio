var browserify = require('browserify');
var lessify = require('node-lessify');
var hbsfy = require('hbsfy');
var fs = require('fs');
var _ = require('underscore');

var watch = (process.argv.indexOf('--watch') > -1) || (process.argv.indexOf('-w') > -1);
var debug = (process.argv.indexOf('--debug') > -1) || (process.argv.indexOf('-d') > -1);
var staticfiles = (process.argv.indexOf('--staticfiles') > -1) || (process.argv.indexOf('-s') > -1);

var infoLog = function(msg) {
  console.info('Watchify: ' + msg);
};
var errLog = function(msg) {
  console.error('Watchify: ' + msg);
};

var createBundles = function (b, bundles) {
  b.plugin('factor-bundle', { outputs: _.map(bundles, function(item) {return item.target_file;}) });
    // Don't use minifyify except in production.
  if (!debug) {
    b.plugin('minifyify', {map: false});
  }
  try {
    b.bundle(
      function(err, buf){
        if (err) {
          errLog(err);
        } else {
          fs.createWriteStream(__dirname + '/contentcuration' + (staticfiles ? '' : '/contentcuration') + '/static/js/bundles/common.js').write(buf);
          infoLog(bundles.length + ' Bundles written.');
        }

      }
    );
  }
  catch (err) {
    errLog(err);
  }
};

var staticContentDir = __dirname + '/contentcuration/contentcuration/static/';

var bundles = [];

// path of modules, catches files that aren't included inside of explicit module files
var modulePaths = [];

var jsModules = staticContentDir + 'js';
if (fs.existsSync(jsModules)) {
  modulePaths.push(jsModules);
}
var lessModules = staticContentDir + 'less';
if (fs.existsSync(lessModules)) {
  modulePaths.push(lessModules);
}

var bundleModulesPath = staticContentDir + 'js/bundle_modules';

// add existing bundle modules to the things we're going to write
if (fs.existsSync(bundleModulesPath)) {
  var dir_bundles = fs.readdirSync(bundleModulesPath);
  for (var j = 0; j < dir_bundles.length; j++) {
    bundles.push({
      target_file: staticContentDir + 'js/bundles/' + dir_bundles[j],
      bundle: bundleModulesPath + '/' + dir_bundles[j],
      alias: dir_bundles[j].split('.').slice(0,-1).join('.')
    });
  }
}

infoLog('Found ' + bundles.length + ' bundle' + (bundles.length !== 1 ? 's' : '') + ', compiling.');

// create the bundles directory regardless of whether or not there are bundle modules - the static check
if (!fs.existsSync(__dirname + '/contentcuration' + (staticfiles ? '' : '/contentcuration') + '/static/js/bundles/')) {
  fs.mkdirSync(__dirname + '/contentcuration' + (staticfiles ? '' : '/contentcuration') + '/static/js/bundles/');
}

// now that we've collected the bundle modules we need, set up browserify
var b = browserify({
  paths: modulePaths,
  cache: {},
  packageCache: {},
  debug: true,
});

// all the files are being included inplicitly by watching the modules we hand-write
_.each(bundles,
  function(item) {
    b.add(item.bundle, {expose: item.alias});
  }
);

// handlebars translation
b.transform(hbsfy);

// less translation
b.transform(lessify,
  { // less options
    global: true,
  }
);

if (watch) {
  var watchify = require('watchify');
  b.plugin(watchify,
    { // watchify options
      verbose: true
    }
  );

  infoLog('Starting watcher');

  b.on('update', function (ids) {
    infoLog('files changed, bundle updated');
    _.each(ids, function(id) {infoLog(id + ' changed');});
    createBundles(b, bundles);
  });

  b.on('log', infoLog);

  b.on('error', function(error) {
    errLog(error , 'came from watch');
    this.emit('end');
  });
}

createBundles(b, bundles);