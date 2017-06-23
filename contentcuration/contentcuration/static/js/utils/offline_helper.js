require("offline-js");
require("../../css/offline-language-english.css");
require("../../css/offline-theme-slide.css");
require("utils/snake");

var disabledOverlay = document.createElement("DIV");
disabledOverlay.className = "fade";
disabledOverlay.setAttribute('id', 'offline_overlay');

$(function() {
	document.getElementsByTagName('body')[0].appendChild(disabledOverlay);
	disabledOverlay.style.display = "none";
});


Offline.options = {
	checks: {xhr: {url: window.Urls.health()}},
	language: "english",
	theme: "slide",
	// game:true //Enable to add snake game while waiting for server to reconnect
}

var run = function(){
 	if (Offline.state === 'up') {
	 	Offline.check();
	 	Offline.on('down', function() {disabledOverlay.style.display = "block";});
        Offline.on('up', function() {disabledOverlay.style.display = "none";});
 	}
}
setInterval(run, 5000);
