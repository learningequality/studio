import { availableLanguages, currentLanguage, sortLanguages } from '../i18n';

export default {
  methods: {
    switchLanguage(code) {
      // TODO: Get the proper languge url, it's i18n/setlang but get it from window.Urls?
      console.log("SWITCHING THAT LANGUAGE YO!");
    },
  },
  computed: {
    languageOptions() {
      return sortLanguages(Object.values(availableLanguages), currentLanguage);
    }
  },
};
