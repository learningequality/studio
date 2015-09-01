var Handlebars = require("hbsfy/runtime");
var showdown  = require('showdown');
var sanitizer = require("sanitizer");

// A little bit of magic to let us use Django JS Reverse directly from inside a Handlebars template
// Simply pass any arguments that you might otherwise use in order
Handlebars.registerHelper('url', function(url_name) {
    var ref;
    // Make check more robust so that undefined urls also return empty string
    if (((ref = window.Urls) !== undefined ? ref[url_name] : void 0) !== undefined) {
        var args = Array.prototype.slice.call(arguments, 1, -1);
        return window.Urls[url_name].apply(window.Urls, args);
    } else {
        if (!window.Urls) {
            console.warn("Django Reverse JS not loaded");
        } else if (!window.Urls[url_name]) {
            console.warn("Url name invalid");
        }
        return "";
    }
});

// A little bit of magic to let us render markdown into a Handlebars template
Handlebars.registerHelper('markdown', function(markdown) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(markdown);
    // We should be santizing on the server side as well, but let's be safe and sanitize the HTML.
    html = sanitizer.sanitize(html);
    return html;
});