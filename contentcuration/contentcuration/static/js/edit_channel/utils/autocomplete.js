var Models = require("edit_channel/models");

function addAutocomplete(element, values, callback, appendTo){

	element.autocomplete({
      source: values,
      minLength: 0,
      select: function( event, ui ) {
        element.blur();
        callback(ui.item, element);
        return false;
      },
      appendTo: appendTo || "body",
      messages: {
          noResults: '',
          results: function() {}
      }
    }).click(function() {
      $(this).autocomplete("search");
    });
}

module.exports = {
	addAutocomplete : addAutocomplete
}