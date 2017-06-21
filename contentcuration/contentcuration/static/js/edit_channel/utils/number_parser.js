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

const LINE = /^(.*)$/g;
const SIGN = /-?/;
const DIGIT = /[0-9]/;
const NON_ZERO_DIGIT = /[1-9]/;
const UNFORMATTED_INT = new RegExp(DIGIT.source + "*");
const FORMATTED_INT = new RegExp(DIGIT.source + "{1,3}(?:," + DIGIT.source + "{3})+");
const INTEGER = new RegExp("(" + SIGN.source + "(?:" + FORMATTED_INT.source + "|" + UNFORMATTED_INT.source + "))");
const NON_ZERO_INT = new RegExp("(" + SIGN.source + NON_ZERO_DIGIT.source + "(?:" + DIGIT.source + "{0,2}(?:," + DIGIT.source + "{3})+|" + UNFORMATTED_INT.source + ")?)");
const FRACTION = new RegExp(INTEGER.source + "/" + NON_ZERO_INT.source);
const MIXED_NUMBER = new RegExp("(" + INTEGER.source + ") +(" + FRACTION.source + ")");
const DECIMAL = new RegExp(INTEGER.source + "\\." + UNFORMATTED_INT.source);
const PERCENTAGE = new RegExp("(" + DECIMAL.source + "|" + MIXED_NUMBER.source + "|" + FRACTION.source + "|" + INTEGER.source + ")%");
const EXPONENT = new RegExp("(" + DECIMAL.source + "|" + INTEGER.source + ")e\\+?(" + INTEGER.source + ")");


function extract_value(text){
  return parse_valid_number(text);
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
  var number = match && Number.parseInt(match[1].replace(',', ''));
  return match && (isNaN(number))? null : number;
}

function parse_decimal(text){
  var match = DECIMAL.exec(text);
  return match && Number.parseFloat(match[0].replace(',', ''));
}

function parse_percentage(text){
  var match = PERCENTAGE.exec(text);
  return match && extract_value(match[1]) / 100;
}

function parse_exponent(text){
  var match = EXPONENT.exec(text);
  return match && eval(extract_value(match[1]) + "e" + extract_value(match[4]));
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

module.exports = {
  extract_value : extract_value,
  test_valid_number : test_valid_number
}