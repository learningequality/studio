var $ = require('rawJquery');
var get_cookie = require('./get_cookie');
var csrftoken = get_cookie('csrftoken') || '';

global.jQuery = global.$ = $;

// side effect: bind jquery-ui functionality to jquery object
require('./jquery-ui.js');

// side effect: bind all of bootstrap's opt-in features to jquery object
require('bootstrap/dist/js/npm.js');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function sameOrigin(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
  var host = document.location.host; // host + port
  var protocol = document.location.protocol;
  var sr_origin = '//' + host;
  var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
  return (url === origin || url.slice(0, origin.length + 1) === origin + '/') ||
        (url === sr_origin || url.slice(0, sr_origin.length + 1) === sr_origin + '/') ||
        // or any other URL that isn't scheme relative or absolute i.e relative.
        !(/^(\/\/|http:|https:).*/.test(url));
}

$.ajaxSetup({
  cache: false,
  beforeSend(xhr, settings) {
    if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
            // Send the token to same-origin, relative URLs only.
            // Send the token only if the method warrants CSRF protection
            // Using the CSRFToken value acquired earlier
      xhr.setRequestHeader('X-CSRFToken', csrftoken);
    }
  }
});

$.extend( $.expr[ ':' ], {
  data: $.expr.createPseudo ?
        $.expr.createPseudo(function( dataName ) {
          return function( elem ) {
            return !!$.data( elem, dataName );
          };
        }) :
        // support: jQuery <1.8
        function( elem, i, match ) {
          return !!$.data( elem, match[ 3 ] );
        }
});

module.exports = $;
