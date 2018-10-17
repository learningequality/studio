// include all logic in "base" entrypoint
require('./base');

var Backbone = require("backbone");
var AdministrationRouter = require("../administration/router");

$(function() {
    window.admin_page_router = new AdministrationRouter.Router();
    Backbone.history.start({
      pushState: true,
      // set in Django template
      root: window.url,
    });
});