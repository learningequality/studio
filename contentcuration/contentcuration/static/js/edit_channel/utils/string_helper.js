var globalMessageStore = require("utils/translations");
var _ = require("underscore");

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
  "do_all": "100% Correct",
  "num_correct_in_a_row_10": "10 in a row",
  "num_correct_in_a_row_2": "2 in a row",
  "num_correct_in_a_row_3": "3 in a row",
  "num_correct_in_a_row_5": "5 in a row",
  "m_of_n": "M of N...",
  "do_all_description": "Learner must answer all questions in the exercise correctly (not recommended for long exercises)",
  "num_correct_in_a_row_10_description": "Learner must answer ten questions in a row correctly",
  "num_correct_in_a_row_2_description": "Learner must answer two questions in a row correctly",
  "num_correct_in_a_row_3_description": "Learner must answer three questions in a row correctly",
  "num_correct_in_a_row_5_description": "Learner must answer five questions in a row correctly",
  "m_of_n_description": "Learner must answer M questions correctly from the last N questions answered " +
                        "(e.g. 3 out of 5 means learners need to answer 3 questions correctly out of the " +
                        "5 most recently answered questions)",
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
  "Special Permissions": "Special Permissions",
  "CC BY_description": "The Attribution License lets others distribute, remix, tweak, " +
                      "and build upon your work, even commercially, as long as they credit " +
                      "you for the original creation. This is the most accommodating of licenses " +
                      "offered. Recommended for maximum dissemination and use of licensed materials.",
  "CC BY-SA_description": "The Attribution-ShareAlike License lets others remix, tweak, and build " +
                      "upon your work even for commercial purposes, as long as they credit you and " +
                      "license their new creations under the identical terms. This license is often " +
                      "compared to \"copyleft\" free and open source software licenses. All new works based " +
                      "on yours will carry the same license, so any derivatives will also allow commercial use. " +
                      "This is the license used by Wikipedia, and is recommended for materials that would benefit " +
                      "from incorporating content from Wikipedia and similarly licensed projects.",
  "CC BY-ND_description": "The Attribution-NoDerivs License allows for redistribution, commercial and " +
                      "non-commercial, as long as it is passed along unchanged and in whole, with credit to you.",
  "CC BY-NC_description": "The Attribution-NonCommercial License lets others remix, tweak, and build upon your " +
                      "work non-commercially, and although their new works must also acknowledge you and be " +
                      "non-commercial, they don't have to license their derivative works on the same terms.",
  "CC BY-NC-SA_description": "The Attribution-NonCommercial-ShareAlike License lets others remix, tweak, and build " +
                      "upon your work non-commercially, as long as they credit you and license their new creations " +
                      "under the identical terms.",
  "CC BY-NC-ND_description": "The Attribution-NonCommercial-NoDerivs License is the most restrictive of our six main " +
                      "licenses, only allowing others to download your works and share them with others as long as they " +
                      "credit you, but they can't change them in any way or use them commercially.",
  "All Rights Reserved_description": "The All Rights Reserved License indicates that the copyright holder reserves, or " +
                      "holds for their own use, all the rights provided by copyright law under one specific copyright treaty.",
  "Public Domain_description": "Public Domain work has been identified as being free of known restrictions under copyright " +
                      "law, including all related and neighboring rights.",
  "Special Permissions_description": "Special Permissions is a custom license to use when the current licenses do not apply to " +
                      "the content. The owner of this license is responsible for creating a description of what this license entails.",
}

function translate(constant_id){
  console.log(constant_id)
  var messages = _.extend(CONSTANT_TRANSLATIONS, globalMessageStore["constants"] || {});
  return messages[constant_id];
}


module.exports = {
  format_size : format_size,
  escape_str: escape_str,
  translate: translate
}