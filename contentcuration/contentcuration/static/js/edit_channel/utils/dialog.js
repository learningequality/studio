var Models = require("edit_channel/models");
var template = require("edit_channel/utils/hbtemplates/dialog.handlebars");
var _ = require('underscore')

function dialog(title, submessage, actions, onclose){
  if(!$("#dialog-box").length){
    $('body').append(template({title: title}));
  }

  $(".ui-dialog-title").text(title);
  $("#dialog-box p").text(submessage);
  $('.ui-widget-overlay').fadeIn(10);

  $("#dialog-box").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: false,
    buttons: actions,
    close:function(){
      if(onclose){
        onclose();
      }
      $('.ui-widget-overlay').fadeOut(100);
    },
    open: function(){
      _.defer(function () {
       $('.ui-dialog').find('button').last().focus();
      });
    }
  });

  $("#dialog-box").dialog('open');
  $('.ui-widget-overlay').on('click', function() { $('#dialog-box').dialog( "close" ); });
  $('.ui-dialog').find("button").on('click', function() { $('#dialog-box').dialog( "close" ); });

  $(document).on('keydown', function(event) {
    switch(event.keyCode || event.which){
      case 27: // escape key
        event.stopImmediatePropagation();
        event.preventDefault();
        $(document).off("keydown");
        $('#dialog-box').dialog( "close" );
        return false;
      case 37: // left key
        $('.ui-dialog').find("button:focus").prev().focus();
        break;
      case 39: // right key
        $('.ui-dialog').find("button:focus").next().focus();
        break;
    }
  });
}

module.exports = {
  dialog : dialog
}