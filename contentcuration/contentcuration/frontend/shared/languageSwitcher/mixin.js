import { availableLanguages, currentLanguage, sortLanguages } from '../i18n';
import client from 'shared/client';

export default {
  methods: {
    switchLanguage(code) {
      const url = window.Urls.set_language();
      const payload = { language: code, next: window.location.href };
      client.post(url, payload)
        .then(r => window.location.href = r.data)
        // Server will return 500 if for some reason we're off base
        .catch(() => {
            console.error(`Failed to navigate to ${window.location.href} in language for code ${code}.`)
        });
    },
  },
  computed: {
    languageOptions() {
      return sortLanguages(Object.values(availableLanguages), currentLanguage);
    }
  },
};
