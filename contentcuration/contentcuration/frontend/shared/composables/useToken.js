import { getCurrentInstance } from 'vue';
import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

/**
 * Composable for handling channel token
 * @returns {Object} - Object containing hyphenateToken and copyTokenToClipboard functions
 */
export default function useToken() {
  const { createSnackbar } = useKSnackbar();
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
        createSnackbar({
          text: errorMessage,
          autoDismiss: true,
          announce: true,
          duration: 6000,
        });
      }
      if (onError) {
        onError();
      }
      return Promise.reject(new Error('Clipboard API not available'));
    }

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
          createSnackbar({
            text: successMessage,
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
        }
        if (onSuccess) {
          onSuccess();
        }
      })
      .catch(error => {
        if (errorMessage) {
          createSnackbar({
            text: errorMessage,
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
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
