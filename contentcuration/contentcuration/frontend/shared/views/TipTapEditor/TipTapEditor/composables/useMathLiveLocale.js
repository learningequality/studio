import { watch } from 'vue';

export function useMathLiveLocale(locale) {
  const configureMathLiveLocale = newLocale => {
    if (typeof window !== 'undefined' && window.MathfieldElement) {
      window.MathfieldElement.locale = newLocale;

      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.locale = newLocale;
      }
    }
  };

  // Watch for locale changes
  watch(
    locale,
    newLocale => {
      configureMathLiveLocale(newLocale);
    },
    { immediate: true },
  );

  return {
    configureMathLiveLocale,
  };
}
