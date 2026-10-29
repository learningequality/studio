// NOTE that this list MUST stay in sync with the list of countries
// generated on the backend in contentcuration/management/commands/loadconstants.py,
// and special care should be taken when updating the i18n-iso-countries library.
import countries from 'i18n-iso-countries';
import ar from 'i18n-iso-countries/langs/ar.json';
import en from 'i18n-iso-countries/langs/en.json';
import es from 'i18n-iso-countries/langs/es.json';
import fr from 'i18n-iso-countries/langs/fr.json';
import pt from 'i18n-iso-countries/langs/pt.json';

countries.registerLocale(en);
countries.registerLocale(es);
countries.registerLocale(ar);
countries.registerLocale(fr);
countries.registerLocale(pt);

export default countries;
