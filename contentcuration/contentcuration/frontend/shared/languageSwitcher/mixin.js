import { availableLanguages, currentLanguage, sortLanguages } from '../i18n';
import client from 'shared/client';

export default {
  methods: {
    switchLanguage(code) {
      const url = window.Urls.set_language();
      const payload = { language: code, next: window.location.href };
      client
        .post(url, payload)
        .then(r => (window.location.href = r.data))
        // Server will return 500 if for some reason we're off base
        .catch(() => {
          // Be sure Sentry will pick up this error because if it happens we want to know ASAP
          throw new ReferenceError(
            `Attempted to change language code to ${code}, and then redirect to ${window.location.href} but failed.`,
          );
        });
    },
  },
  computed: {
    languageOptions() {
      return sortLanguages(Object.values(availableLanguages), currentLanguage);
    },
  },
};
