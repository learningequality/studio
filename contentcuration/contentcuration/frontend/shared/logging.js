import * as Sentry from '@sentry/vue';

export default {
  error(error, ...attachments) {
    if (process.env.NODE_ENV !== 'production') {
      // In dev build log warnings to console for developer use
      console.trace(error, ...attachments); // eslint-disable-line no-console
    } else {
      Sentry.withScope(function(scope) {
        for (let attachment of attachments) {
          scope.addAttachment(attachment);
        }
        Sentry.captureException(error);
      });
    }
  },
};
