function pluralize(number, singular, plural) {
    if (!plural) {
      plural = singular + 's'
    }
    const word = number === 1 ? singular : plural;
    return `${number} ${word}`;
}

module.exports = {
  pluralize: pluralize,
}
