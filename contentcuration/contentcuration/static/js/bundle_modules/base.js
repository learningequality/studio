var attachfastclick = require("fastclick");
var $ = require("jquery");
global.$ = $;
global.jQuery = $;

require("bootstrap/less/bootstrap.less");
require("../../less/styles.less");
require("bootstrap/dist/js/npm.js");

$(function() {
    attachfastclick(document.body);
});