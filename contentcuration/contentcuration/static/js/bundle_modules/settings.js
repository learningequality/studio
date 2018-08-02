// include all logic in "base" entrypoint
require('./base');

var dialog = require("edit_channel/utils/dialog");

$(function() {
    window.dialog = dialog;
});
