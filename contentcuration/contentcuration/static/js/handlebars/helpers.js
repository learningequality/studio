var Handlebars = require("handlebars-template-loader/runtime");
var HandlebarsIntl = global.HandlebarsIntl = require('handlebars-intl');
require("./locales/es.js");
var _ = require("underscore");
var marked = require("marked");
var stringHelper = require("edit_channel/utils/string_helper");

HandlebarsIntl.registerWith(Handlebars);

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
  markdown = markdown || "";
  markdown = markdown.toString().replace(/\n(\n)/g, "$1<br />");

  // Escape underscores to allow "blanks"
  var matches = markdown.match(/([_]{3,})/g);
  if(matches){
    matches.forEach(function(match){
      markdown = markdown.replace(match, match.replace(/_/g, "\\_"));
    });
  }

  var el = document.createElement( 'body' );
  el.innerHTML = marked(markdown);
  _.each(el.getElementsByTagName( 'img' ), function(img){
      var groups = /(.+)\s=([0-9|.]*)x((?:[0-9|.]*))/g.exec(unescape(img.src));
      if(groups){
        if(groups[1]) {img.src = groups[1];}
        if(groups[2]) {img.width = groups[2];}
        if(groups[3]) {img.height = groups[3];}
      }
  });
  return stringHelper.unescape(el.innerHTML);
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
  return text === "topic";
});

Handlebars.registerHelper('get_filename', function(text){
  return text.split(".")[-1];
});

Handlebars.registerHelper('format_file_size', function(text){
  return stringHelper.format_size(text);
});

Handlebars.registerHelper('format_count', function(text, count, capitalize){
  text = (capitalize)? text.charAt(0).toUpperCase() + text.slice(1) : text;
  return stringHelper.format_count(text, count);
});
Handlebars.registerHelper('get_icon', function(kind){
  switch (kind){
      case "topic":
          return "folder";
      case "video":
          return "theaters";
      case "audio":
          return "headset";
      case "image":
          return "image";
      case "exercise":
          return "star";
      case "document":
          return "description";
      case "html5":
          return "widgets";
      default:
          return "error";
  }
});

Handlebars.registerHelper('format_question_type', function(type){
  switch (type){
      case "multiple_selection":
      case "single_selection":
      case "true_false":
      case "input_question":
      case "perseus_question":
          return stringHelper.translate(type);
      default:
          return stringHelper.translate("unknown_question");
  }
});

Handlebars.registerHelper('substring', function(text, chars){
  return text.substring(0, chars);
});

Handlebars.registerHelper('question_default_text', function(type){
  return type === "perseus_question"? stringHelper.translate("perseus_question") : stringHelper.translate("no_text_provided");
});

var COUNTER = 0;
Handlebars.registerHelper('counter', function(increment){
  COUNTER += (isNaN(increment))? 1 : Number(increment);
  return COUNTER;
});

Handlebars.registerHelper('to_json', function(obj){
  return JSON.stringify(obj);
});

Handlebars.registerHelper('parse_question', function(str){
  if(!str){ return stringHelper.translate("question"); }
  return str.replace(/\$\$([^\$]+)\$\$/g, " " + stringHelper.translate("formula") + " ").replace(/!\[.*\]\(\${☣ CONTENTSTORAGE}\/([^)]+)\)/g,  " " + stringHelper.translate("image") + " ").replace(/\\/g, "");
});

Handlebars.registerHelper('ispositive', function(num, options) {
  if(num >= 0) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper( 'concat', function() {
  var str = "";
  for (var i = 0; i < arguments.length - 1; ++i){
    str += arguments[i];
  }
  return str;
});

Handlebars.registerHelper( 'translate', function(text) {
    return stringHelper.translate(text);
});

Handlebars.registerHelper( 'join', function(list, delimiter) {
    return list.join(delimiter);
});

Handlebars.registerHelper('format_date', function(date) {
  var monthNames = [
    "Jan", "Feb", "Mar",
    "Apr", "May", "June", "July",
    "Aug", "Sep", "Oct",
    "Nov", "Dec"
  ];
  var date = new Date(date);
  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();
  return monthNames[monthIndex] + " " + day + ", " + year;
});

Handlebars.registerHelper('equal', function(val1, val2, options) {
    return ( val1!=val2 ) ? options.inverse(this) : options.fn(this);
});
