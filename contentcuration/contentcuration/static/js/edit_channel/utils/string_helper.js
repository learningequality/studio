var globalMessageStore = require("utils/translations");

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
  return text.replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/\&/g, "&amp;").replace(/\"/g, "&quot;");
}


var CONSTANT_TRANSLATIONS = {
  "topic": "Topic",
  "video": "Video",
  "audio": "Audio",
  "document": "Document",
  "exercise": "Exercise",
  "html5": "HTML5 App",
  "do_all": "Do All",
  "num_correct_in_a_row_10": "10 in a row",
  "num_correct_in_a_row_2": "2 in a row",
  "num_correct_in_a_row_3": "3 in a row",
  "num_correct_in_a_row_5": "5 in a row",
  "m_of_n": "M out of N",
  "input_question": "Input Question",
  "multiple_selection": "Multiple Selection",
  "single_selection": "Single Selection",
  "perseus_question": "Perseus Question",
  "mp4": "MP4 Video",
  "vtt": "VTT Subtitle",
  "mp3": "MP3 Audio",
  "pdf": "PDF Document",
  "jpg": "JPG Image",
  "jpeg": "JPEG Image",
  "png": "PNG Image",
  "gif": "GIF Image",
  "json": "JSON",
  "svg": "SVG Image",
  "perseus": "Perseus Exercise",
  "zip": "HTML5 Zip",
  "high_res_video": "High Resolution",
  "low_res_video": "Low Resolution",
  "vector_video": "Vectorized",
  "video_thumbnail": "Thumbnail",
  "video_subtitle": "Subtitle",
  "audio_thumbnail": "Thumbnail",
  "document_thumbnail": "Thumbnail",
  "exercise_thumbnail": "Thumbnail",
  "exercise_image": "Exercise Image",
  "exercise_graphie": "Exercise Graphie",
  "channel_thumbnail": "Channel Thumbnail",
  "topic_thumbnail": "Thumbnail",
  "html5_zip": "HTML5 Zip",
  "html5_thumbnail": "Thumbnail",
  "CC BY": "CC BY",
  "CC BY-SA": "CC BY-SA",
  "CC BY-ND": "CC BY-ND",
  "CC BY-NC": "CC BY-NC",
  "CC BY-NC-SA": "CC BY-NC-SA",
  "CC BY-NC-ND": "CC BY-NC-ND",
  "All Rights Reserved": "All Rights Reserved",
  "Public Domain": "Public Domain",
  "Special Permissions": "Special Permissions"
}

function translate(constant_id){
  var messages = _.extend(CONSTANT_TRANSLATIONS, globalMessageStore["constants"] || {});
  return messages[constant_id];
}


module.exports = {
  format_size : format_size,
  escape_str: escape_str,
  translate: translate
}