var Models = require("edit_channel/models");
const State = require("edit_channel/state");
var template = require("edit_channel/utils/hbtemplates/dialog.handlebars");
var _ = require('underscore');
var stringHelper = require("edit_channel/utils/string_helper");

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
    width: State.currentLanguage.lang_code === "es" ? 500 : 400, // Spanish translations tend to be longer
    modal: false,
    buttons: actions,
    zIndex: 10000,
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
  $('.ui-widget-overlay').css('z-index', 1000000).on('click', function() { $('#dialog-box').dialog( "close" ); });
  $('.ui-dialog').css('z-index', 1000000).find("button").on('click', function() { $('#dialog-box').dialog( "close" ); });

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

function alert(title, message, callback){
  callback = callback || function(){};
  dialog(title, message, {
      [stringHelper.translate("ok")]:function(){}
  }, callback);
}

module.exports = {
  dialog : dialog,
  alert : alert
}
