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

module.exports = {
  format_size : format_size
}