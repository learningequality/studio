var attachfastclick = require("fastclick");
var $ = require("jquery");
global.$ = $;
global.jQuery = $;

require("bootstrap/less/bootstrap.less");
require("bootstrap/dist/js/npm.js");
require("bootstrap/dist/css/bootstrap.css");
require("../../less/styles.less");

$(function() {
    attachfastclick(document.body);
});