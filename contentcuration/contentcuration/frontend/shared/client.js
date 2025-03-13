import omit from 'lodash/omit';
import axios, { isCancel } from 'axios';
import qs from 'qs';
import * as Sentry from '@sentry/vue';

export function paramsSerializer(params) {
  // Do custom querystring stingifying to comma separate array params
  return qs.stringify(params, {
    arrayFormat: 'comma',
    encoder: function(str, defaultEncoder, charset, type) {
      if (type === 'key') {
        // Handle params for queries to joint indexes
        // of the form [index1+index2]
        // Turn into parameter:
        // _index1_index2_
        // This is mostly an implementation detail caused by the
        // fact that filters are defined in Python with bare variables names
        // and the []+ characters would violate Python variable naming rules
        return defaultEncoder(str.replace(/[[\]+]/g, '_'));
      } else if (type === 'value') {
        return defaultEncoder(str);
      }
    },
  });
}

const client = axios.create({
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  paramsSerializer: {
    serialize: paramsSerializer,
  },
});

// Track when the browser was last offline for error reporting purposes
let lastOffline = null;
window.addEventListener('offline', () => {
  lastOffline = Date.now();
});

const pendingRequests = new Set();

// Create an AbortController for managing pending requests
const abortController = new AbortController();

window.addEventListener('navigate', () => {
  // Create a fresh AbortController to ensure proper cancellation of requests 
  // for each navigation and prevent interference from previous aborts.
  const newAbortController = new AbortController();
  abortController.signal = newAbortController.signal;

  // Abort pending requests when navigation begins
  abortController.abort();
});

window.addEventListener('beforeunload', () => {
  abortController.abort();
});

// Add request interceptor to track pending requests
client.interceptors.request.use(config => {
  // Add signal to the request config
  config.signal = abortController.signal;
  pendingRequests.add(config);
  return config;
});

client.interceptors.response.use(
  response => {
    // Remove from pending requests on success
    pendingRequests.delete(response.config);
    return response;
  },
  error => {
    // Remove from pending requests on error
    if (error.config) {
      pendingRequests.delete(error.config);
    }

    // Ignore specific types of errors
    if (
      isCancel(error) ||
      (error.response && [302, 403, 404, 405, 412].includes(error.response.status)) // added 302
    ) {
      return Promise.reject(error);
    }
    const url = error.config?.url || 'unknown';
    let message = error.message;
    const status = error.response?.status || 0;

    // Suppress contentnode query errors
    if (url.includes('contentnode')) {
      return Promise.reject(error);
    }

    message = message ? `${message}: [${status}] ${url}` : `Network Error: [${status}] ${url}`;

    if (process.env.NODE_ENV !== 'production') {
      // In dev build log warnings to console for developer use
      console.warn('AJAX Request Error: ' + message); // eslint-disable-line no-console
      console.warn('Error data: ', error); // eslint-disable-line no-console
    } else if (error.code !== 'ECONNABORTED') {
      Sentry.withScope(function(scope) {
        scope.addAttachment({
          filename: 'error.json',
          // strip csrf token from headers
          data: JSON.stringify(omit(error, ['config.headers.X-CSRFToken'])),
          contentType: 'application/json',
        });
        Sentry.captureException(new Error(message), {
          extra: {
            Request: {
              headers: error.config.headers,
              method: error.config.method,
              url,
            },
            Network: {
              lastOffline: lastOffline ? `${Date.now() - lastOffline}ms ago` : 'never',
              online: navigator.onLine,
            },
          },
        });
      });
    }
    return Promise.reject(error);
  }
);

export default client;
