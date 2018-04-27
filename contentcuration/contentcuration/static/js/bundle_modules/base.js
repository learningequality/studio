// var attachfastclick = require('fastclick');

// side effect: binds handlebars helpers to our handlebars instance
require('../handlebars/helpers.js');
// side effect: adds shared styles to the DOM
require('../../less/styles.less');

require('../utils/offline_helper');

// Promise polyfill
if(!global.Promise) {
  global.Promise = require('promise-polyfill');
}


$(function() {
  // attachfastclick(document.body);
});
