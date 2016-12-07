var Models = require("edit_channel/models");

function dialog(title, submessage, options){
  var dialog = document.createElement("div");
  dialog.setAttribute('id',"dialog-box");
  dialog.setAttribute('title',title);
  var paragraph = document.createElement("p");
  paragraph.innerHTML="submessage";
  dialog.appendChild(paragraph);
  document.body.appendChild(dialog);

  $("#dialog-box").dialog({
      resizable: false,
      height: "auto",
      width: 400,
      modal: true,
      buttons: {
        "Delete all items": function() {
          $( this ).dialog( "close" );
        },
        Cancel: function() {
          $( this ).dialog( "close" );
        }
      }
    });
}

module.exports = {
  dialog : dialog
}