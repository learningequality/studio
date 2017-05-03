var browserify = require('browserify');
var lessify = require('node-lessify');
var hbsfy = require('hbsfy');
var fs = require('fs');
var _ = require('underscore');

var watch = false;
var debug = false;
var staticfiles = false;

if (process.argv.indexOf('--watch') > -1 || process.argv.indexOf('-w') > -1) {
  watch = true;
}

if (process.argv.indexOf('--debug') > -1 || process.argv.indexOf('-d') > -1) {
  debug = true;
}

if (process.argv.indexOf('--staticfiles') > -1 || process.argv.indexOf('-s') > -1) {
  staticfiles = true;
}

var log = function(msg) {
  console.info('Watchify: ' + msg);
};

var create_bundles = function (b, bundles) {
  b.plugin('factor-bundle', { outputs: _.map(bundles, function(item) {return item.target_file;}) });
    // Don't use minifyify except in production.
  if (!debug) {
    b.plugin('minifyify', {map: false});
  }
  try {
    b.bundle(
      function(err, buf){
        if (err) {
          console.error(err, 'came from functions error catcher');
        }

        fs.createWriteStream(__dirname + '/contentcuration' + (staticfiles ? '' : '/contentcuration') + '/static/js/bundles/common.js').write(buf);
        log(bundles.length + ' Bundles written.');
      }
    );
  }
  catch (err) {
    console.error(err, 'came from try/catch');
  }
};

var staticContentDir = __dirname + '/contentcuration/contentcuration/static/';

console.log(staticContentDir);

var bundles = [];
var module_paths = [];

var module_js = staticContentDir + 'js';
if (fs.existsSync(module_js)) {
  module_paths.push(module_js);
}
var module_less = staticContentDir + 'less';
if (fs.existsSync(module_less)) {
  module_paths.push(module_less);
}
var bundle_path = staticContentDir + 'js/bundle_modules';

// add existing bundle modules to the things we're going to write
if (fs.existsSync(bundle_path)) {
  var dir_bundles = fs.readdirSync(bundle_path);
  for (var j = 0; j < dir_bundles.length; j++) {
    bundles.push({
      target_file: staticContentDir + 'js/bundles/' + dir_bundles[j],
      bundle: bundle_path + '/' + dir_bundles[j],
      alias: dir_bundles[j].split('.').slice(0,-1).join('.')
    });
  }

  // create the main bundles' directory, but only if we need it. Going to be created anyway later.
  // if (dir_bundles.length > 0) {
  //   if (!fs.existsSync(staticContentDir + 'js/bundles')) {
  //     fs.mkdirSync(staticContentDir + 'js/bundles');
  //   }
  // }
}

log('Found ' + bundles.length + ' bundle' + (bundles.length !== 1 ? 's' : '') + ', compiling.');

// create the bundles directory regardless of whether or not there are bundle modules - the static check
if (!fs.existsSync(__dirname + '/contentcuration' + (staticfiles ? '' : '/contentcuration') + '/static/js/bundles/')) {
  fs.mkdirSync(__dirname + '/contentcuration' + (staticfiles ? '' : '/contentcuration') + '/static/js/bundles/');
}

// now that we've collected the bundle modules we need, set up browserify
var b = browserify({
  paths: module_paths,
  cache: {},
  packageCache: {},
  debug: true,
});

// add the bundle modules to browserify? SO it's looking at the paths for code we write,
// and the bundles that happen as a result. Where are these bundles being created?
// they aren't. We're making them by hand. SO all the files are being included inplicitly by
// watching the modules
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

  log('Starting watcher');

  b.on('update', function (ids) {
    log('files changed, bundle updated');
    _.each(ids, function(id) {log(id + ' changed');});
    create_bundles(b, bundles);
  });

  b.on('log', log);

  b.on('error', function(error) {
    console.error(error , 'came from watch');
    this.emit('end');
  });
}

create_bundles(b, bundles);