import * as Sentry from '@sentry/vue';

export default {
  error(error, ...attachments) {
    if (process.env.NODE_ENV === 'development') {
      // In dev build log warnings to console for developer use
      console.trace(error, ...attachments); // eslint-disable-line no-console
    } else if (process.env.NODE_ENV === 'production') {
      Sentry.withScope(function (scope) {
        for (const attachment of attachments) {
          scope.addAttachment(attachment);
        }
        Sentry.captureException(error);
      });
    }
  },
};
