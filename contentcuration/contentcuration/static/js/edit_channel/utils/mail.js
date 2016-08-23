function send_mail(channel, email){
  return new Promise(function(resolve, reject){
    var data = {
      "channel_id": channel.get("id"),
      "user_email": email
    };
    $.ajax({
      method:"POST",
        url: window.Urls.send_invitation_email(),
        data:  JSON.stringify(data),
        success:function(data){
          resolve(JSON.parse(data).invitation_id);
        },
        error:function(error){
          reject(error);
        }
    });
  });
}

module.exports = {
  send_mail : send_mail
}