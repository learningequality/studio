import Vue from 'vue';
import vueIntl from 'vue-intl';
import { $trWrapper } from './';

const translations = window.ALL_MESSAGES || {}; // Set in django

// Flatten translation dictionary
const unnested_translations = {};
Object.keys(translations).forEach(function(key) {
  Object.keys(translations[key]).forEach(function(nestedKey) {
    unnested_translations[key + '.' + nestedKey] = translations[key][nestedKey];
  });
});

Vue.use(vueIntl, { defaultLocale: 'en' });

let currentLanguage = 'en';
if (global.languageCode) {
  currentLanguage = global.languageCode;
  Vue.setLocale(currentLanguage);
}

Vue.registerMessages(currentLanguage, unnested_translations);
Vue.prototype.$tr = function $tr(messageId, args) {
  const nameSpace = this.$options.name;
  return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
};
