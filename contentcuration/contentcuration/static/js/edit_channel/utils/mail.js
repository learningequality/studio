function send_mail(channel, email, callback){
  var data = {
    "channel_id": channel.get("id"),
    "user_email": email
  };
  $.ajax({
    method:"POST",
      url: window.Urls.send_invitation_email(),
      data:  JSON.stringify(data),
      async: false,
      success:function(data){
        callback(JSON.parse(data).invitation_id);
      }
  });
}

module.exports = {
  send_mail : send_mail
}