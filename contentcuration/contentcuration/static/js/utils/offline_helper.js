/*
	NOTE: Need to add language to contentcuration/templatetags/translation_tags.py
	when adding a new language.
*/

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
    "en": "english",
    "es": "spanish"
}

function getOfflineLanguageName(code) {
	return languageMapping[code.split("-")[0]] || languageMapping['en'];
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
	language: language,
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
