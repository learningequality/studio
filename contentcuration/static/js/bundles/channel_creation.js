require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"channel_creation":[function(require,module,exports){
var Views = require("new_channel/views");
var $ = require("jquery");

$(function(){
	var new_channel_view = Views.NewChannelView({});
});
},{"jquery":94,"new_channel/views":53}],53:[function(require,module,exports){
var Backbone = require("backbone");
require("boilerplate.less");

var BoilerPlateView = Backbone.View.extend({
	template: require("./hbtemplates/boilerplate.handlebars")
});

module.exports = {
	BoilerPlateView: BoilerPlateView
}
},{"./hbtemplates/boilerplate.handlebars":52,"backbone":64,"boilerplate.less":55}],55:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "@font{font-family:\"Open Sans\";src:url(\"../fonts/OpenSans-Regular.ttf\") format(\"truetype\")}.inline-block{display:inline-block}body{background:#292a2b}a{text-decoration:none;cursor:pointer;color:black}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],52:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div>This should be changed/deleted</div>";
  });

},{"hbsfy/runtime":93}]},{},["channel_creation"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uXFxub2RlX21vZHVsZXNcXGZhY3Rvci1idW5kbGVcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvYnVuZGxlX21vZHVsZXMvY2hhbm5lbF9jcmVhdGlvbi5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvbmV3X2NoYW5uZWwvdmlld3MuanMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2xlc3MvYm9pbGVycGxhdGUubGVzcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvbmV3X2NoYW5uZWwvaGJ0ZW1wbGF0ZXMvYm9pbGVycGxhdGUuaGFuZGxlYmFycyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWaWV3cyA9IHJlcXVpcmUoXCJuZXdfY2hhbm5lbC92aWV3c1wiKTtcclxudmFyICQgPSByZXF1aXJlKFwianF1ZXJ5XCIpO1xyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cdHZhciBuZXdfY2hhbm5lbF92aWV3ID0gVmlld3MuTmV3Q2hhbm5lbFZpZXcoe30pO1xyXG59KTsiLCJ2YXIgQmFja2JvbmUgPSByZXF1aXJlKFwiYmFja2JvbmVcIik7XHJcbnJlcXVpcmUoXCJib2lsZXJwbGF0ZS5sZXNzXCIpO1xyXG5cclxudmFyIEJvaWxlclBsYXRlVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcclxuXHR0ZW1wbGF0ZTogcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvYm9pbGVycGxhdGUuaGFuZGxlYmFyc1wiKVxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdEJvaWxlclBsYXRlVmlldzogQm9pbGVyUGxhdGVWaWV3XHJcbn0iLCIoZnVuY3Rpb24oKSB7IHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTsgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTsgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7dmFyIGNzcyA9IFwiQGZvbnR7Zm9udC1mYW1pbHk6XFxcIk9wZW4gU2Fuc1xcXCI7c3JjOnVybChcXFwiLi4vZm9udHMvT3BlblNhbnMtUmVndWxhci50dGZcXFwiKSBmb3JtYXQoXFxcInRydWV0eXBlXFxcIil9LmlubGluZS1ibG9ja3tkaXNwbGF5OmlubGluZS1ibG9ja31ib2R5e2JhY2tncm91bmQ6IzI5MmEyYn1he3RleHQtZGVjb3JhdGlvbjpub25lO2N1cnNvcjpwb2ludGVyO2NvbG9yOmJsYWNrfVwiO2lmIChzdHlsZS5zdHlsZVNoZWV0KXsgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzOyB9IGVsc2UgeyBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTsgfSBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTt9KCkpIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxkaXY+VGhpcyBzaG91bGQgYmUgY2hhbmdlZC9kZWxldGVkPC9kaXY+XCI7XG4gIH0pO1xuIl19
