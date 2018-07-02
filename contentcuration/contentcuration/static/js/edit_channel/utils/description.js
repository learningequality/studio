var stringHelper = require("edit_channel/utils/string_helper");

function Description (description, el, split_index) {
  /*
    Handles description show more/less logic

    Args:
      description (str): text to use
      el ($el): element to put text in
      split_index (int): where to split text
    Example: var description = new Description("sample", $("#target"), 100)
  */
  this.template = require("./hbtemplates/description.handlebars");
  description = description.trim();
  split_index = split_index || 49;

  while (description.charAt(split_index) != " " && split_index < 60){
    split_index ++;
  }

  if (description.length - split_index <= 15){
    split_index = description.length;
  }

  this.expanded = false;
  el.html(this.template({
      description: description,
      first_part: description.substring(0, Math.min(split_index, description.length)),
      overflow : (description.length > split_index) ? description.substring(split_index, description.length) : null,
      more_text: stringHelper.translate("more")
  }));

  this.toggle = function(event) {
    event.stopPropagation();
    event.preventDefault();
    el.find(".toggle_description").text((this.expanded) ? stringHelper.translate("more") : stringHelper.translate("less"));
    (this.expanded)? el.find(".overflow").slideUp(100) :
      el.find(".overflow").slideDown(100, function() { el.find(".overflow").css("display", "inline"); });
    this.expanded = !this.expanded;
  }

  el.find(".toggle_description").on("click", this.toggle);
}

module.exports = {Description: Description}