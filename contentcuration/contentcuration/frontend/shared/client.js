import axios from 'axios';
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
  paramsSerializer,
});

client.interceptors.response.use(
  response => response,
  error => {
    const url = error.config.url;
    let message = error.message;
    let status = 0;
    if (error.response) {
      status = error.response.status;
      message = error.response.statusText;
      // Don't send a Sentry report for permissions errors
      // Many 404s are in fact also unauthorized requests so
      // we should silence those on the front end and try
      // to catch legitimate request issues in the backend.
      //
      // Allow 412 too as that's specific to out of storage checks
      if (status === 403 || status === 404 || status === 405 || status === 412) {
        return Promise.reject(error);
      }
    }

    message = message ? `${message}: ${url}` : `Network Error: ${url}`;

    if (process.env.NODE_ENV !== 'production') {
      // In dev build log warnings to console for developer use
      console.warn('AJAX Request Error: ' + message); // eslint-disable-line no-console
      console.warn('Error data: ', error); // eslint-disable-line no-console
    } else {
      Sentry.withScope(function(scope) {
        scope.addAttachment({
          filename: 'error.json',
          data: JSON.stringify(error),
          contentType: 'application/json',
        });
        Sentry.captureException(new Error(message), {
          extra: {
            Request: {
              headers: error.config.headers,
              method: error.config.method,
              url,
            },
          },
        });
      });
    }
    return Promise.reject(error);
  }
);

export default client;
