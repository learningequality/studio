function send_mail(channel, email, share_mode){
  return new Promise(function(resolve, reject){
    var data = {
      "channel_id": channel.get("id"),
      "user_email": email,
      "share_mode": share_mode
    };
    $.ajax({
      method:"POST",
        url: window.Urls.send_invitation_email(),
        data:  JSON.stringify(data),
        success:function(data){
          var Models = require("edit_channel/models");
          resolve(new Models.InvitationModel(JSON.parse(data)));
        },
        error:function(error){
          reject(error);
        }
    });
  });
}


function send_custom_email(emails, subject, message){
  return new Promise(function(resolve, reject){
    var data = {
      "subject": subject,
      "message": message,
      "emails": emails
    };
    $.ajax({
      method:"POST",
        url: window.Urls.send_custom_email(),
        data:  JSON.stringify(data),
        success:resolve,
        error:reject
    });
  });
}

module.exports = {
  send_mail: send_mail,
  send_custom_email: send_custom_email
}