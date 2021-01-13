import Vue from 'vue';
import vueIntl from 'vue-intl';
import { $trWrapper } from './';

const translations = window.ALL_MESSAGES || {}; // Set in django

Vue.use(vueIntl, { defaultLocale: 'en' });

let currentLanguage = 'en';
if (global.languageCode) {
  currentLanguage = global.languageCode;
  Vue.setLocale(currentLanguage);
}

Vue.registerMessages(currentLanguage, translations);
Vue.prototype.$tr = function $tr(messageId, args) {
  const nameSpace = this.$options.name;
  return $trWrapper(nameSpace, this.$options.$trs, this.$formatMessage, messageId, args);
};

Vue.prototype.$isRTL = window.isRTL;
