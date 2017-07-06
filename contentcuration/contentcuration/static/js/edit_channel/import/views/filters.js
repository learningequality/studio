function pluralize(number, singular, plural) {
    if (!plural) {
      plural = singular + 's'
    }
    const word = number === 1 ? singular : plural;
    return `${number} ${word}`;
}

function parenthesize(value) {
  return '(' + value + ')';
}

module.exports = {
  pluralize: pluralize,
  parenthesize: parenthesize,
}
