var Models = require("edit_channel/models");

function dialog(title, submessage, actions, onclose){
  var overlay = document.createElement('div');
  overlay.setAttribute('class', "ui-widget-overlay");
  var dialog = document.createElement("div");
  dialog.setAttribute('id',"dialog-box");
  dialog.setAttribute('title',title);
  var paragraph = document.createElement("p");
  paragraph.innerHTML=submessage;
  dialog.appendChild(paragraph);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  var buttons = {}
  for (var key in actions){
    buttons[key] = function() {
        if(actions[key]){
          actions[key]();
        }

        $("#dialog-box").dialog( "close" );
      }
  }

  $("#dialog-box").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: false,
    buttons: buttons,
    close:function(){
      if(onclose){
        onclose();
      }

      $('.ui-widget-overlay').fadeOut();
      $('#dialog-box').remove();
    }
  });

  $("#dialog-box").dialog('open');
  $('.ui-widget-overlay').on('click', function() {
       $('#dialog-box').dialog( "close" );
  });
  $(document).on('keydown', function(event) {
    var code = event.keyCode ? event.keyCode : event.which;
      if (code == 27) {
        event.stopImmediatePropagation();
        event.preventDefault();
        $(document).off("keydown");
        $('#dialog-box').dialog( "close" );
        return false;
      }
  });

}

module.exports = {
  dialog : dialog
}