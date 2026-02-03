import { getCurrentInstance } from 'vue';

/**
 * Composable for handling channel token
 * @returns {Object} - Object containing hyphenateToken and copyTokenToClipboard functions
 */
export default function useToken() {
  const clipboardAvailable = Boolean(navigator.clipboard);
  const instance = getCurrentInstance();

  /**
   * Hyphenate token
   * @param {String} token - Token to hyphenate
   * @returns {String} - Hyphenated token
   */
  function hyphenateToken(token) {
    if (token.includes('-')) {
      return token;
    } else {
      return token.slice(0, 5) + '-' + token.slice(5);
    }
  }

  /**
   * Copy token to clipboard
   * @param {string} token - Token to copy
   * @param {Object} options - Options object
   * @param {Boolean} options.hyphenate - Whether to hyphenate the token before copying
   * @param {String} options.successMessage - Snackbar message to show on successful copy
   * @param {String} options.errorMessage - Snackbar message to show on error
   * @param {Function} options.onSuccess - Additional callback function on successful copy
   * @param {Function} options.onError - Additional callback function on error
   */
  function copyTokenToClipboard(
    token,
    { hyphenate, successMessage, errorMessage, onSuccess, onError } = {},
  ) {
    if (!clipboardAvailable) {
      if (errorMessage) {
        store.dispatch('showSnackbar', { text: errorMessage });
      }
      if (onError) {
        onError();
      }
      return Promise.reject(new Error('Clipboard API not available'));
    }

    const store = instance.proxy.$store;
    const analytics = instance.proxy.$analytics;

    let tokenToCopy = token;
    if (hyphenate) {
      tokenToCopy = hyphenateToken(token);
    }

    return navigator.clipboard
      .writeText(tokenToCopy)
      .then(() => {
        analytics.trackEvent('copy_token');
        if (successMessage) {
          store.dispatch('showSnackbar', { text: successMessage });
        }
        if (onSuccess) {
          onSuccess();
        }
      })
      .catch(error => {
        if (errorMessage) {
          store.dispatch('showSnackbar', { text: errorMessage });
        }
        if (onError) {
          onError(error);
        }
        throw error;
      });
  }

  return {
    hyphenateToken,
    copyTokenToClipboard,
  };
}
