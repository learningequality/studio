
var Handlebars = require("hbsfy/runtime");
var marked = require("marked");
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: false,
  breaks: true,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  smartypants: false
});

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

    if (markdown) {
        markdown = markdown.replace(/\n(\n)/g, "$1<br />");
        return marked(markdown);
    } else {
        return "";
    }
});

// Replace newline characters with \n
Handlebars.registerHelper('parse_newlines', function(text) {
  if (text) {
    text = text.replace(/\n/g, "\\n");
  }
  return text;
});

// Convert text to all caps
Handlebars.registerHelper('to_upper_case', function(text){
  return text.toUpperCase();
});

Handlebars.registerHelper('check_is_topic', function(text){
  return text.toLowerCase() == "topic";
<<<<<<< HEAD
});

Handlebars.registerHelper('format_file_size', function(text){
  var value = Number(text);
  if(value > 999999999)
    return parseInt(value/1000000000) + "GB";
  else if(value > 999999)
    return parseInt(value/1000000) + "MB";
  else if(value > 999)
    return parseInt(value/1000) + "KB";
  else
    return parseInt(value) + "B";
=======
>>>>>>> 3f016463678668c047c96803884f94ba7614f270
});