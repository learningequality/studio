// NOTE that this list MUST stay in sync with the list of countries
// generated on the backend in contentcuration/management/commands/loadconstants.py,
// and special care should be taken when updating the i18n-iso-countries library.
const countries = require('i18n-iso-countries');
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
countries.registerLocale(require('i18n-iso-countries/langs/es.json'));
countries.registerLocale(require('i18n-iso-countries/langs/ar.json'));
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));
countries.registerLocale(require('i18n-iso-countries/langs/pt.json'));

export default countries;
