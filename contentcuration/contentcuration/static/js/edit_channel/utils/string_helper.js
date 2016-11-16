function format_size(text){
  if (!text) {
    return "0B";
  }
  var value = Number(text);
  if(value > 999999999)
    return parseInt(value/1000000000) + "GB";
  else if(value > 999999)
    return parseInt(value/1000000) + "MB";
  else if(value > 999)
    return parseInt(value/1000) + "KB";
  else
    return parseInt(value) + "B";
}

function escape_str(text){
  return text.replace(/>/g, "&gt;").replace(/</g, "&lt;")
        .replace(/\//g, "&#x2F;").replace(/\&/g, "&amp;")
        .replace(/\"/g, "&quot;").replace(/\'/g, "&#x27;");
}

function update_word_count(input, counter, limit){
    var char_length = limit - input.val().length;
    if(input.val().trim() == ""){
      char_length = limit;
    }
      counter.html(char_length + ((char_length  == 1) ? " char left" : " chars left"));
      counter.css("color", (char_length == 0)? "red" : "gray");
}

module.exports = {
  format_size : format_size,
  escape_str:escape_str,
  update_word_count:update_word_count
}