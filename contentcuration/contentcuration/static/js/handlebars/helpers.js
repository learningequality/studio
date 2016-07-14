var Handlebars = require("hbsfy/runtime");
var marked = require("marked");
var stringHelper = require("edit_channel/utils/string_helper");

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
});

Handlebars.registerHelper('get_filename', function(text){
  return text.split(".")[-1];
});

Handlebars.registerHelper('format_file_size', function(text){
  return stringHelper.format_size(text);
});

Handlebars.registerHelper('format_count', function(text, count){
  if(Number(count) === 1){
    return count + " " + text;
  }
  return count + " " + text + "s";
});
Handlebars.registerHelper('get_icon', function(kind){
  switch (kind){
      case "topic":
          return "folder-close";
      case "video":
          return "film";
      case "audio":
          return "headphones";
      case "image":
          return "picture";
      case "exercise":
          return "star";
      case "document":
          return "file";
      default:
          return "exclamation-sign";
  }
});