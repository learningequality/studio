// var domtoimage = require('dom-to-image');
// require("./mathjax/MathJax");
// MathJax.Hub.Config({
//     showProcessingMessages: false,
//     jax: ["input/TeX","input/MathML","output/SVG", "output/PreviewHTML"],
//       extensions: ["tex2jax.js","mml2jax.js","MathMenu.js","MathZoom.js", "fast-preview.js", "AssistiveMML.js", "[Contrib]/a11y/accessibility-menu.js"],
//       TeX: {
//         extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js"]
//       }
// });

// var config = {
//     showProcessingMessages: false,
//     jax: ["input/TeX","input/MathML","output/SVG"],
//     extensions: ["tex2jax.js","mml2jax.js","MathMenu.js","MathZoom.js", "fast-preview.js", "AssistiveMML.js", "[Contrib]/a11y/accessibility-menu.js"],
//     TeX: {extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js"]}
// }

var SvgGenerator = {
  svg_container: null,     // filled in by Init below
  timeout: null,     // store setTimout id
  mjRunning: false,  // true when MathJax is processing
  mjPending: false,  // true when a typeset has been queued

  //  Get the preview and buffer DIV's
  Init: function () {
    this.svg_container = document.createElement("canvas");
    this.svg_container.id = "mathjax_container";
  },

  // Generate mathjax based on input
  Update: function (text, callback) {
    if (this.timeout) {clearTimeout(this.timeout)}
    this.timeout = setTimeout(this.callback, this.delay, text, callback);
  },

  //  Creates the preview and runs MathJax on it.
  //  Indicate that MathJax is running, and start the
  //    typesetting.  After it is done, call PreviewDone.
  GenerateSVG: function (text, callback) {
    SvgGenerator.timeout = null;
    if (this.mjPending) return;
    if (this.mjRunning) {
      this.mjPending = true;
      MathJax.Hub.Queue(["GenerateSVG",this]);
    } else {
      this.svg_container.innerHTML = text;
      this.mjRunning = true;
      MathJax.Hub.Queue(
        ["Typeset",MathJax.Hub,this.svg_container],
        ["SVGDone",this, text, callback]
      );
    }
  },

  //  Indicate that MathJax is no longer running and return the result
  SVGDone: function (text, callback) {
    this.mjRunning = this.mjPending = false;
    var result = $(this.svg_container).find('svg')[0];
    if (result){
      result.setAttribute("data-texstring", text);
      callback(result);
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.svg_container]);
    }
  },

  ApplyTypeset: function(element){
    MathJax.Hub.Queue(["Typeset",MathJax.Hub,element] );
  }
};

//  Cache a callback to the GenerateSVG action
SvgGenerator.callback = MathJax.Callback(["GenerateSVG",SvgGenerator]);
SvgGenerator.callback.autoReset = true;  // make sure it can run more than once
SvgGenerator.Init();

function initMathJax(){
    // loadModule().then(function(){
    //     console.log("loaded module")
    //     loadConfig().then(function(){
    //         console.log("GOT ALL")
    //     });
    // });
}

function loadModule(){
    return new Promise(function(resolve, reject){
        var loadscript = document.createElement('script');
        loadscript.type = 'text/javascript';
        loadscript.src = 'https://cdn.mathjax.org/mathjax/latest/MathJax.js';
        loadscript.onload = function(){
            resolve(true);
        }
    });
}

function loadConfig(){
    return new Promise(function(resolve, reject){
        var configscript = document.createElement('script');
        configscript.type = 'text/x-mathjax-config';
        configscript.text = 'MathJax.Hub.Config(' + JSON.stringify(config) + ');';
        configscript.onload = function(){
            resolve(true);
        }
    });
}


function toSVG(text){
    return new Promise(function(resolve, reject){
        SvgGenerator.Update(text, function(result){
          resolve(result)
        });
    });
}

function typeset(element){
    SvgGenerator.ApplyTypeset(element);
}

module.exports = {
	initMathJax : initMathJax,
    toSVG :toSVG,
    typeset:typeset
}