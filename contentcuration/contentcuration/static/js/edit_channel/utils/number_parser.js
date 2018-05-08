/****************
NOTE: Need to update contentcuration/utils/parser.py too

--- NUMBER REGULAR EXPRESSIONS ---
VALID_NUMBER: [MIXED_NUMBER | FRACTION | DECIMAL | PERCENTAGE | INTEGER]
DECIMAL: INTEGER.UNFORMATTED_INT
PERCENTAGE: [DECIMAL | MIXED_NUMBER | FRACTION]%
MIXED_NUMBER: INTEGER FRACTION
FRACTION: INTEGER/NON_ZERO_INT
NON_ZERO_INT: SIGN[NON_ZERO_DIGIT]([DIGIT]{0,2}(,DIGIT{3})*|[UNFORMATTED_INT])?
INTEGER: SIGN[FORMATTED_INT | UNFORMATTED_INT]
FORMATTED_INT: [DIGIT]{1,3}[,DIGIT{3}]+
UNFORMATTED_INT: [DIGIT]*
DIGIT: [0-9]
NON_ZERO_DIGIT: [1-9]
SIGN: -{0,1}
EXPONENT: [DECIMAL | INTEGER]e+{0,1}[INTEGER]

TODO: Add log and pi?

****************/
var SEP = /,/g;
var POINT = /\./;
if (window.languageCode.startsWith("es")) {
  SEP = /\./g;
  POINT = /,/;
}

var LINE = /^(.*)$/;
var SIGN = /-?/;
var DIGIT = /[0-9]/;
var NON_ZERO_DIGIT = /[1-9]/;
var UNFORMATTED_INT = new RegExp(DIGIT.source + "*");
var FORMATTED_INT = new RegExp(DIGIT.source + "{1,3}(?:" + SEP.source + DIGIT.source + "{3})+");
var INTEGER = new RegExp("(" + SIGN.source + "(?:" + FORMATTED_INT.source + "|" + UNFORMATTED_INT.source + "))");
var NON_ZERO_INT = new RegExp("(" + SIGN.source + NON_ZERO_DIGIT.source + "(?:" + DIGIT.source + "{0,2}(?:" + SEP.source + DIGIT.source + "{3})+|" + UNFORMATTED_INT.source + ")?)");
var FRACTION = new RegExp(INTEGER.source + "/" + NON_ZERO_INT.source);
var MIXED_NUMBER = new RegExp("(" + INTEGER.source + ") +(" + FRACTION.source + ")");
var DECIMAL = new RegExp(INTEGER.source + POINT.source + UNFORMATTED_INT.source);
var PERCENTAGE = new RegExp("(" + DECIMAL.source + "|" + MIXED_NUMBER.source + "|" + FRACTION.source + "|" + INTEGER.source + ")%");
var EXPONENT = new RegExp("(" + DECIMAL.source + "|" + INTEGER.source + ")e\\+?(" + INTEGER.source + ")");

function parse(text) {
  var num = extract_value(text.replace('\\', '')); // need to remove slashes for escaped characters to get regexps working
  return num && num.toString().replace(".", POINT.source).replace('\\', '');
}

function extract_value(text){
  if(!text) {
    return 0;
  }
  return parse_valid_number(text)
}

function parse_valid_number(text){
  return parse_exponent(text) || parse_percentage(text) || parse_mixed_number(text) || parse_fraction(text) || parse_decimal(text) || parse_integer(text);
}

function parse_mixed_number(text){
  var match = MIXED_NUMBER.exec(text);
  if(match){
    var number = parse_integer(match[1]);
    return (Math.abs(number) + parse_fraction(match[3])) * (number < 0? -1 : 1);
  }
  return null;
}

function parse_fraction(text){
  var match = FRACTION.exec(text);
  return match && parse_integer(match[1]) / parse_integer(match[2]);
}

function parse_integer(text){
  var match = INTEGER.exec(text);
  var number = match && Number.parseInt(to_en(match[1]));
  return match && (isNaN(number))? null : number;
}

function parse_decimal(text){
  var match = DECIMAL.exec(text);
  return match && Number.parseFloat(to_en(match[0]));
}

function parse_percentage(text){
  var match = PERCENTAGE.exec(text);
  return match && extract_value(match[1]) / 100;
}

function parse_exponent(text){
  var match = EXPONENT.exec(text);
  var val1 = match && extract_value(match[1])
  var val2 = match && extract_value(match[4])
  return val1 && val2 && eval(to_en(val1) + "e" + to_en(val2));
}

function test_valid_number(text){
  return test_exponent(text) || test_mixed_number(text) || test_fraction(text) || test_percentage(text) || test_decimal(text) || test_integer(text);
}

function test_mixed_number(text){
  return MIXED_NUMBER.test(text);
}

function test_fraction(text){
  return FRACTION.test(text);
}

function test_integer(text){
  return INTEGER.test(text);
}

function test_decimal(text){
  return DECIMAL.test(text);
}

function test_percentage(text){
  return PERCENTAGE.test(text);
}

function test_exponent(text){
  return EXPONENT.test(text);
}

function to_en(text){
  return text.toString().replace(SEP, '').replace(POINT, '.');
}

module.exports = {
  parse: parse,
  extract_value : extract_value,
  test_valid_number : test_valid_number
}
