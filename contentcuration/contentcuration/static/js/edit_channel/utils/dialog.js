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
      $(document).off("keydown");
      $(".modal").attr('tabindex', -1);
      $('.ui-widget-overlay').fadeOut(100);
    },
    open: function(){
      _.defer(function () {
       $('.ui-dialog').find('button').last().focus();
      });
    }
  });

  $(".modal").attr('tabindex', null);
  $("#dialog-box").dialog('open');
  $('.ui-widget-overlay').on('click', function() { $('#dialog-box').dialog( "close" ); });
  $('.ui-dialog').find("button").on('click', function() { $('#dialog-box').dialog( "close" ); });

  $(document).on('keydown', function(event){
    switch(event.charCode || event.keyCode || event.which){
      case 27: // escape key
        event.keyCode = event.which = event.charCode = 0;
        event.returnValue = false;
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        $('#dialog-box').dialog( "close" );
        $(document).off("keydown", this);
        $(document).unbind("keydown", this);
        return false;
      case 37: // left key
        $('.ui-dialog').find("button:focus").prev().focus();
        event.stopPropagation();
        event.preventDefault();
        break;
      case 39: // right key
        $('.ui-dialog').find("button:focus").next().focus();
        event.stopPropagation();
        event.preventDefault();
        break;
    }
  });
}

module.exports = {
  dialog : dialog
}