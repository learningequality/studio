var fastclick = require('fastclick');

window.$ = $;

// side effect: binds handlebars helpers to our handlebars instance
require('../handlebars/helpers.js');
// side effect: adds shared styles to the DOM
require('../../less/styles.less');

if (!window.DEBUG) {
  require('../utils/offline_helper');
}

// Promise polyfill
if (!global.Promise) {
  // TODO make it async
  global.Promise = require('promise-polyfill');
}

$(function() {
  $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    let message = thrownError || jqXHR.statusText;

    // Don't send a Sentry report for permissions errors
    // Many 404s are in fact also unauthorized requests so
    // we should silence those on the front end and try
    // to catch legitimate request issues in the backend.
    if (jqXHR.status === 403 || jqXHR.status === 404) {
      return;
    }

    // Status 0 errors can happen for a couple different reasons:
    // 1. An API call was made and then a navigation event happened (harmless, user-initiated)
    // 2. The browser didn't receive a response from the server on time (error text is 'timeout')
    // 3. DNS Resolution failed. Health checks should catch any issues on our end.

    // This code does not try to send a report for non-timeout GET requests, as the notes
    // above indicate that there is likely nothing we can do about these cases. If it is
    // a failed PUT / POST, we still submit a report so we can make sure we are handling
    // that case properly in the front end and aware of cases where a post may fail.
    if (jqXHR.status === 0) {
      if (thrownError == 'timeout' || jqXHR.statusText === 'timeout') {
        message = 'Network Error: ' + ajaxSettings.url;
      } else if (ajaxSettings.type != 'GET' && ajaxSettings.data) {
        message = ajaxSettings.type + ' Error: ' + ajaxSettings.url;
      } else {
        return;
      }
    }

    // If we have a signed in user, make sure we add them to the report.
    if (window.user && window.user.id) {
      Raven.setUserContext({ id: window.user.id, email: window.user.email });
    }

    // Put the URL in the main message for timeouts so we can see which timeouts are most frequent.
    if (jqXHR.status === 504 || jqXHR.status === 522 || jqXHR.status === 524) {
      message = 'Request Timed Out: ' + ajaxSettings.url;
    }

    // These two messages indicate a server-wide problem, so don't include the URL
    // in the name to make it easier for Sentry to aggregate them.
    // Response data will just be generic error HTML from CloudFlare.
    if (jqXHR.status === 502) {
      message = 'Bad Gateway (502)';
    }

    if (jqXHR.status === 503) {
      message = 'Service Unavailable (503)';
    }

    // jqXHR.responseText may be null for some reason, so make it an empty string in that case.
    let responseText = jqXHR.responseText;
    if (!responseText) {
      responseText = '';
    }

    const extraData = {
      type: ajaxSettings.type,
      url: ajaxSettings.url,
      data: ajaxSettings.data,
      status: jqXHR.status,
      error: thrownError || jqXHR.statusText,
      response: responseText.substring(0, 100),
    };

    console.warn('AJAX Request Error: ' + message); // eslint-disable-line no-console
    console.warn('Error data: ' + JSON.stringify(extraData)); // eslint-disable-line no-console
    if (Raven && Raven.captureMessage) {
      Raven.captureMessage(message, {
        extra: extraData,
      });
    }
  });

  // TODO revaluate need. From their repo:
  // Note: As of late 2015 most mobile browsers (notably Chrome and Safari)
  // no longer have a 300ms touch delay, so fastclick offers no benefit on newer
  // browsers, and risks introducing bugs into your application.
  //
  // Consider carefully whether you really need to use it!
  fastclick.attach(document.body);
});
