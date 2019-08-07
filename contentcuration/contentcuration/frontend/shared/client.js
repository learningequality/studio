import axios from 'axios';

const client = axios.create({
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

client.interceptors.response.use(
  response => response,
  error => {
    let message;
    let url;
    let config;
    if (error.response) {
      config = error.response.config;
      url = config.url;
      message = error.response.statusText;
      // Don't send a Sentry report for permissions errors
      // Many 404s are in fact also unauthorized requests so
      // we should silence those on the front end and try
      // to catch legitimate request issues in the backend.
      if (error.response.status === 403 || error.response.status === 404) {
        return;
      }

      if (error.response.status === 0) {
        message = 'Network Error: ' + url;
      }

      // Put the URL in the main message for timeouts so we can see which timeouts are most frequent.
      if (error.response.status === 504) {
        message = 'Request Timed Out: ' + url;
      }
    } else if (error.request) {
      // Request was sent but no response received
      config = error.request.config;
      url = config.url;
      message = 'Network Error: ' + url;
    } else {
      message = error.message;
    }

    const extraData = {
      type: config ? config.responseType : null,
      url: url,
      data: config ? config.data : null,
      status: error.response ? error.response.status : null,
      error: message,
      response: error.response ? error.response.data : null,
    };

    console.warn('AJAX Request Error: ' + message); // eslint-disable-line no-console
    console.warn('Error data: ' + JSON.stringify(extraData)); // eslint-disable-line no-console
    if (Raven && Raven.captureMessage) {
      Raven.captureMessage(message, {
        extra: extraData,
      });
    }
  }
);

export default client;
