/* Helper function returns less variables for a selector */
function loadLessVariablesFor(selector){
	var oLess = {};
	$.each(document.styleSheets,function(i,sheet){
		$.each(sheet.cssRules,function(i,rule){
			var sRule = rule.cssText;
			if (sRule.substr(0,5)==selector) {
				var aKey = sRule.match(/\.(\w+)/);
				var aVal = sRule.match(/(\d+)/);
				if (aKey&&aVal) oLess[aKey[1]] = aVal[0]<<0;
			}
		});
	});
	console.log(oLess);
}

module.exports = {
	loadLessVariablesFor: loadLessVariablesFor
}