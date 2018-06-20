var fastclick = require('fastclick');
window.$ = $;

// side effect: binds handlebars helpers to our handlebars instance
require('../handlebars/helpers.js');
// side effect: adds shared styles to the DOM
require('../../less/styles.less');

require('../utils/offline_helper');

// Promise polyfill
if(!global.Promise) {
  // TODO make it async
  global.Promise = require('promise-polyfill');
}


$(function() {
  // TODO revaluate need. From their repo:
  // Note: As of late 2015 most mobile browsers - notably Chrome and Safari - no longer have a 300ms touch delay, so fastclick offers no benefit on newer browsers, and risks introducing bugs into your application. Consider carefully whether you really need to use it.
  fastclick.attach(document.body);
});
