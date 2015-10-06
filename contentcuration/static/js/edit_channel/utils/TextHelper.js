/* Helper function trims text if it is too long for container */
function trimText(string, filler, limit, link){
	if(string.trim().length > limit)
		string = string.trim().substring(0, limit - filler.length) + ((link) ? "<a class=\"filler\" title=\"" + string + "\">" + filler + "</a>" : filler);
	return string;
}
/* Helper function expands or minimizes size of folder based on description length*/
function manageFolder(event, expanding){
	event.preventDefault();
	event.stopPropagation();
	var DOMHelper = require("edit_channel/utils/DOMHelper");
	var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id + " label";
	
	if(expanding)
		$(el + " p").html($(el + " p a").prop("title") + "<br/><a title=\"" + $(el + " p a").prop("title") +"\" class=\"minimize\">See Less</a>");
	else
		$(el + " p").html(trimText($(el + " p a").prop("title") , "... read more", 120, true));
	$(el).animate({height: $(el + " p").height() + 35});
}
module.exports = {
	trimText: trimText,
	manageFolder: manageFolder
}