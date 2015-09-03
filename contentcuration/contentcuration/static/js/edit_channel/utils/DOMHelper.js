function getParentOfTag(el, type){
	while(el.nodeName != type.toUpperCase())
		el = el.parentNode;
	return el;
}

function getParentOfClass(el, className){
	while(el && el.className.indexOf(className.trim()) <= -1)
		el = el.parentNode;
	return el;
}

module.exports = {
	getParentOfTag: getParentOfTag,
	getParentOfClass: getParentOfClass
}