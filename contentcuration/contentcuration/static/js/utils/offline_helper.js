var $ = require('jquery');
require("offline-js");
require("../../css/offline-theme-slide.css");
require("utils/snake");

/* For debugging (comment/uncomment as needed) */
// require("./offline-simulate-ui.min");
// var
// 	$online = $('.online'),
// 	$offline = $('.offline');

// Offline.on('confirmed-down', function () {
// 	$online.fadeOut(function () {
// 		$offline.fadeIn();
// 	});
// });

// Offline.on('confirmed-up', function () {
// 	$offline.fadeOut(function () {
// 		$online.fadeIn();
// 	});
// });

var languageMapping = {
	"en": {
		"language": "english",
		"load": function() {
			require("../../css/offline-language-english.css");
		}
	},
	"es": {
		"language": "spanish",
		"load": function() {
			require("../../css/offline-language-spanish.css");
		}
	}
}

function getOfflineLanguageName(code) {
	var language = languageMapping[code.split("-")[0]];
	language.load();
	return language.language;
}


var disabledOverlay = document.createElement("DIV");
disabledOverlay.className = "fade";
disabledOverlay.setAttribute('id', 'offline_overlay');

$(function() {
	document.getElementsByTagName('body')[0].appendChild(disabledOverlay);
	disabledOverlay.style.display = "none";
});

var language = getOfflineLanguageName(window.languageCode || "en");

Offline.options = {
	checks: {xhr: {url: window.Urls.stealth()}},
	language: language, //getOfflineLanguageName(window.languageCode || "en"),
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
