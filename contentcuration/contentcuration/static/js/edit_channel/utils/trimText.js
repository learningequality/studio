/* Helper function trims text if it is too long for container */
function trimText(string, filler, limit, link){
	if(string.trim().length > limit)
		string = string.trim().substring(0, limit - filler.length) + ((link) ? "<a title=\"" + string + "\">" + filler + "</a>" : filler);
	return string;
}
module.exports = {
	trimText: trimText
}