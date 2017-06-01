function format_size(text){
  if (!text) {
    return "0B";
  }
  var value = Number(text);
  var isnegative = value < 0;
  value = Math.abs(value)
  if(value > 999999999)
    return (isnegative ? "-" : "") + Math.round(parseFloat(value/1000000000)) + "GB";
  else if(value > 999999)
    return (isnegative ? "-" : "") + Math.round(parseFloat(value/1000000)) + "MB";
  else if(value > 999)
    return (isnegative ? "-" : "") + Math.round(parseFloat(value/1000)) + "KB";
  else
    return (isnegative ? "-" : "") + Math.round(parseFloat(value)) + "B";
}

function escape_str(text){
  return text.replace(/>/g, "&gt;").replace(/</g, "&lt;")
        replace(/\&/g, "&amp;").replace(/\"/g, "&quot;");
}

module.exports = {
  format_size : format_size,
  escape_str:escape_str,
}