var _ = require("underscore");
var i18n = require("../../utils/i18n");

function format_size(text){
  if (!text) {
    return "0B";
  }
  var value = Number(text);
  var isnegative = value < 0;
  value = Math.abs(value)

  var KB = parseFloat(1024)
  var MB = parseFloat(Math.pow(KB, 2))
  var GB = parseFloat(Math.pow(KB, 3))
  var TB = parseFloat(Math.pow(KB, 4))

  if(value < KB)
      return (isnegative ? "-" : "") + Math.round(value) + "B"
  else if(KB <= value && value < MB)
      return (isnegative ? "-" : "") + Math.round(parseFloat(value/KB)) + "KB"
  else if (MB <= value && value < GB)
      return (isnegative ? "-" : "") + Math.round(parseFloat(value/MB)) + "MB"
  else if (GB <= value && value < TB)
      return (isnegative ? "-" : "") + Math.round(parseFloat(value/GB)) + "GB"
  else if (TB <= value)
      return (isnegative ? "-" : "") + Math.round(parseFloat(value/TB)) + "TB"
}

function escape_str(text){
  return text.replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/\&/g, "&amp;").replace(/\"/g, "&quot;");
}

function unescape(text){
  return text.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
}

var namespace = "constants";

var messages = {
  "topic": "Topic",
  "video": "Video",
  "audio": "Audio",
  "document": "Document",
  "exercise": "Exercise",
  "html5": "HTML5 App",
  "topic_plural": "Topics",
  "video_plural": "Videos",
  "audio_plural": "Audio",
  "document_plural": "Documents",
  "exercise_plural": "Exercises",
  "html5_plural": "HTML5 Apps",
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
  "m_of_n_description": "Learner must answer M questions correctly from the last N questions answered (e.g. 3 out of 5 means learners need to answer 3 questions correctly out of the 5 most recently answered questions)",
  "input_question": "Input Question",
  "multiple_selection": "Multiple Selection",
  "single_selection": "Single Selection",
  "perseus_question": "Perseus Question",
  "true_false": "True/False",
  "unknown_question": "Unknown Question Type",
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
  "CC BY_description": "The Attribution License lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of licenses offered. Recommended for maximum dissemination and use of licensed materials.",
  "CC BY-SA_description": "The Attribution-ShareAlike License lets others remix, tweak, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under the identical terms. This license is often compared to \"copyleft\" free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia, and is recommended for materials that would benefit from incorporating content from Wikipedia and similarly licensed projects.",
  "CC BY-ND_description": "The Attribution-NoDerivs License allows for redistribution, commercial and non-commercial, as long as it is passed along unchanged and in whole, with credit to you.",
  "CC BY-NC_description": "The Attribution-NonCommercial License lets others remix, tweak, and build upon your work non-commercially, and although their new works must also acknowledge you and be non-commercial, they don't have to license their derivative works on the same terms.",
  "CC BY-NC-SA_description": "The Attribution-NonCommercial-ShareAlike License lets others remix, tweak, and build upon your work non-commercially, as long as they credit you and license their new creations under the identical terms.",
  "CC BY-NC-ND_description": "The Attribution-NonCommercial-NoDerivs License is the most restrictive of our six main licenses, only allowing others to download your works and share them with others as long as they credit you, but they can't change them in any way or use them commercially.",
  "All Rights Reserved_description": "The All Rights Reserved License indicates that the copyright holder reserves, or holds for their own use, all the rights provided by copyright law under one specific copyright treaty.",
  "Public Domain_description": "Public Domain work has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.",
  "Special Permissions_description": "Special Permissions is a custom license to use when the current licenses do not apply to the content. The owner of this license is responsible for creating a description of what this license entails.",
  "view_access": "Can View",
  "edit_access": "Can Edit",
  "view": "view",
  "edit": "edit",
  "view_access_only": "You can only grant view access",
  "edit_access_only": "You can only grant edit access",
  "title": "Title",
  "description": "Description",
  "license": "License",
  "license_description": "License Description",
  "copyright_holder": "Copyright Holder",
  "author": "Author",
  "extra_fields": "Extra Fields",
  "question": "Question",
  "ok": "OK",
  "Square root": "Square Root",
  "Bar": "Bar",
  "Underline": "Underline",
  "Left arrow": "Left Arrow",
  "Right arrow": "Right Arrow",
  "Vector": "Vector",
  "Superscript": "Superscript",
  "Subscript": "Subscript",
  "Fraction": "Fraction",
  "Binomial coefficient": "Binomial Coefficient",
  "Sum": "Sum",
  "Product": "Product",
  "Coproduct": "Coproduct",
  "Integral": "Integral",
  "BASIC": "BASIC",
  "Addition": "Addition",
  "Subtraction": "Subtraction",
  "Multiplication": "Multiplication",
  "Division": "Division",
  "Dot": "Dot",
  "Negation": "Negation",
  "Plus-minus": "Plus-Minus",
  "Minus-plus": "Minus-Plus",
  "Does not equal": "Does Not Equal",
  "Approximately": "Approximately",
  "Proportional": "Proportional",
  "Definition": "Definition",
  "Greater than": "Greater than",
  "Greater than or equal to": "Greater than or Equal to",
  "Not greater than": "Not Greater than",
  "Significantly greater than": "Significantly Greater than",
  "Less than": "Less than",
  "Less than or equal to": "Less than or Equal to",
  "Not less than": "Not Less than",
  "Significantly less than": "Significantly Less than",
  "Left ceiling": "Left Ceiling",
  "Left floor": "Left Floor",
  "Right ceiling": "Right Ceiling",
  "Right floor": "Right Floor",
  "ADVANCED": "ADVANCED",
  "Tensor product": "Tensor Product",
  "Contour integral": "Contour Integral",
  "Nabla": "Nabla",
  "Conjugate": "Conjugate",
  "Conjugate transpose": "Conjugate Transpose",
  "Partial": "Partial",
  "Wedge product": "Wedge Product",
  "Infinity": "Infinity",
  "Top element": "Top Element",
  "Reducible to": "Reducible to",
  "Nondominated by": "Nondominated by",
  "LOGIC": "LOGIC",
  "And": "And",
  "Or": "Or",
  "If and only if": "If and Only If",
  "Entails": "Entails",
  "Implies": "Implies",
  "Given that/Such that": "Given that/Such that",
  "Exists": "Exists",
  "For all": "For All",
  "Because": "Because",
  "Therefore": "Therefore",
  "QED": "QED",
  "Exclusive or": "Exclusive Or",
  "GEOMETRY": "GEOMETRY",
  "Degrees": "Degrees",
  "Angle": "Angle",
  "Measured angle": "Measured Angle",
  "Parallel": "Parallel",
  "Perpendicular": "Perpendicular",
  "Incomparable to": "Incomparable to",
  "Similar to": "Similar to",
  "Similar or equal to": "Similar or Equal to",
  "Congruent to": "Congruent to",
  "SETS": "SETS",
  "Ellipsis": "Ellipsis",
  "Ellipsis (vertical)": "Ellipsis (Vertical)",
  "Ellipsis (centered)": "Ellipsis (Centered)",
  "Ellipsis (diagonal)": "Ellipsis (Diagonal)",
  "Cardinality": "Cardinality",
  "Intersection": "Intersection",
  "Union": "Union",
  "Empty set": "Empty Set",
  "In": "In",
  "Not in": "Not In",
  "Contains": "Contains",
  "Symmetric difference": "Symmetric Difference",
  "Set difference": "Set Difference",
  "Subset": "Subset",
  "Subset or equal": "Subset or Equal",
  "Not a subset or equal": "Not a Subset or Equal",
  "Superset": "Superset",
  "Superset or equal": "Superset or Equal",
  "Not a superset or equal": "Not a Superset or Equal",
  "Wreath product": "Wreath Product",
  "Natural join": "Natural Join",
  "DIRECTIONAL": "DIRECTIONAL",
  "Down": "Down",
  "Down (double)": "Down (Double)",
  "Triangle down": "Triangle Down",
  "Up": "Up",
  "Up (double)": "Up (Double)",
  "Triangle up": "Triangle Up",
  "Up-down": "Up-Down",
  "Up-down (double)": "Up-Down (Double)",
  "Left": "Left",
  "Left (double)": "Left (Double)",
  "Left (long)": "Left (Long)",
  "Left (long, double)": "Left (Long, Double)",
  "Left (hooked)": "Left (Hooked)",
  "Left (harpoon down)": "Left (Harpoon Down)",
  "Left (harpoon up)": "Left (Harpoon Up)",
  "Right": "Right",
  "Right (double)": "Right (Double)",
  "Right (long)": "Right (Long)",
  "Right (long, double)": "Right (Long, Double)",
  "Right (hooked)": "Right (Hooked)",
  "Right (harpoon down)": "Right (Harpoon Down)",
  "Right (harpoon up)": "Right (Harpoon Up)",
  "Left-right": "Left-Right",
  "Left-right (double)": "Left-Right (Double)",
  "Left-right (long)": "Left-Right (Long)",
  "Left-right (long, double)": "Left-Right (Long, Double)",
  "Northeast": "Northeast",
  "Northwest": "Northwest",
  "Southeast": "Southeast",
  "Southwest": "Southwest",
  "CHARACTERS": "CHARACTERS",
  "alpha": "alpha",
  "beta": "beta",
  "chi": "chi",
  "Delta": "Delta",
  "delta": "delta",
  "digamma": "digamma",
  "ell": "ell",
  "epsilon": "epsilon",
  "eta": "eta",
  "Gamma": "Gamma",
  "gamma": "gamma",
  "Planck's constant": "Planck's Constant",
  "iota": "iota",
  "kappa": "kappa",
  "Lambda": "Lambda",
  "lambda": "lambda",
  "mu": "mu",
  "nu": "nu",
  "Omega": "Omega",
  "omega": "omega",
  "Phi": "Phi",
  "phi": "phi",
  "Pi": "Pi",
  "pi": "pi",
  "Psi": "Psi",
  "psi": "psi",
  "rho": "rho",
  "Sigma": "Sigma",
  "sigma": "sigma",
  "tau": "tau",
  "Theta": "Theta",
  "theta": "theta",
  "Upsilon": "Upsilon",
  "upsilon": "upsilon",
  "P": "P",
  "Xi": "Xi",
  "xi": "xi",
  "zeta": "zeta",
  "MISCELLANEOUS": "MISCELLANEOUS",
  "Circle": "Circle",
  "Club": "Club",
  "Diamond": "Diamond",
  "Heart": "Heart",
  "Spade": "Spade",
  "Flat": "Flat",
  "Natural": "Natural",
  "Sharp": "Sharp",
  "coach": "Coaches",
  "learner": "Anyone",
  "role_visibility": "Visible to",
  "more": "... More",
  "less": " Less",
  "no_text_provided": "No text provided",
  "image": "IMAGE",
  "formula": "FORMULA",
  "export_error_text": "Error exporting data. Please try again.",
  "export_title": "Exporting Data",
  "export_text": "Data export started. You'll receive an email with your information when it's done."
};

var translate = i18n.createTranslator(namespace, messages);

function format_count(text, count){
  var template = require("edit_channel/utils/hbtemplates/count.handlebars");
      var div = document.createElement("DIV");
      div.id = "intl_wrapper";
      var language = window.languages && window.languages.find(function(l) { return l.id && l.id.toLowerCase() === window.languageCode; });
      $(div).html(template({
        count: count,
        text: text
      }, {
        data: {
          intl: {
            locales: [(language && language.id) || "en-US"],
            messages: {"count": "{count, plural,\n =0 {text}\n =1 {# {text}}\n other {# {text}s}}"}
          }
        }
      }));
      var contents = div.innerHTML;
      div.remove();
      return contents;
}

function format_number(number){
  var template = require("edit_channel/utils/hbtemplates/number.handlebars");
      var div = document.createElement("DIV");
      div.id = "intl_wrapper";
      var language = window.languages && window.languages.find(function(l) { return l.id && l.id.toLowerCase() === window.languageCode; });
      $(div).html(template({
        number: number
      }, {
        data: {
          intl: {
            locales: [(language && language.id) || "en-US"],
            messages: {}
          }
        }
      }));
      var contents = div.innerHTML;
      div.remove();
      return contents;
}

function get_translation(messages, message_id, data, data2, data3, data4){
    // Get dynamically generated messages
    if (data !== undefined){
      var template = require("edit_channel/utils/hbtemplates/intl.handlebars");
      var div = document.createElement("DIV");
      div.id = "intl_wrapper";
      var language = window.languages && window.languages.find(function(l) { return l.id && l.id.toLowerCase() === window.languageCode; });
      var intl_data = {
        intl: {
          locales: [(language && language.id) || "en-US"],
          messages: messages
        }
      };

      $(div).html(template({
        data: data,
        data2: data2,
        data3: data3,
        data4: data4,
        message_id: message_id
      }, {
        data: intl_data
      }));
      var contents = div.innerHTML;
      div.remove();
      return contents;
    } else {
      return messages[message_id];
    }
}

module.exports = {
  format_size : format_size,
  escape_str:escape_str,
  format_count: format_count,
  translate: translate,
  unescape: unescape,
  get_translation: get_translation,
  format_number: format_number
}
