import Vue from 'vue';

export function $trWrapper(nameSpace, defaultMessages, formatter, messageId, args) {
  if (args) {
    if (!Array.isArray(args) && typeof args !== 'object') {
      throw TypeError(`The $tr functions take either an array of positional
                      arguments or an object of named options.`);
    }
  }

  // Handle the possibility that the message is defined with an object including context.
  const messageValue = defaultMessages[messageId];
  const defaultMessageText =
    typeof messageValue === 'object' && messageValue.hasOwnProperty('message')
      ? messageValue.message
      : messageValue;

  const message = {
    id: `${nameSpace}.${messageId}`,
    defaultMessage: defaultMessageText,
  };

  return formatter(message, args);
}

/**
 * Class exposing translation functions for a particular message name space.
 * @class
 */
class Translator {
  /**
   * Create a Translator object.
   * @param {string} nameSpace - The nameSpace of the messages for translation.
   * @param {object} defaultMessages - an object mapping message ids to default messages.
   */
  constructor(nameSpace, defaultMessages) {
    this.nameSpace = nameSpace;
    this.defaultMessages = defaultMessages;
  }
  $tr(messageId, args) {
    return $trWrapper(
      this.nameSpace,
      this.defaultMessages,
      Vue.prototype.$formatMessage,
      messageId,
      args
    );
  }
  // For convenience, also proxy all vue intl translation methods on this object
  $formatDate(date, options = {}) {
    return Vue.prototype.$formatDate(date, options);
  }
  $formatTime(time, options = {}) {
    return Vue.prototype.$formatTime(time, options);
  }
  $formatRelative(date, options = {}) {
    return Vue.prototype.$formatRelative(date, options);
  }
  $formatNumber(number, options = {}) {
    return Vue.prototype.$formatNumber(number, options);
  }
  $formatPlural(plural, options = {}) {
    return Vue.prototype.$formatPlural(plural, options);
  }
}

/**
 * Returns a Translator instance.
 * @param {string} nameSpace - The nameSpace of the messages for translation.
 * @param {object} defaultMessages - an object mapping message ids to default messages.
 */
export function createTranslator(nameSpace, defaultMessages) {
  return new Translator(nameSpace, defaultMessages);
}

const titleStrings = createTranslator('TitleStrings', {
  defaultTitle: 'Kolibri Studio',
  catalogTitle: 'Kolibri Content Library Catalog',
  tabTitle: '{title} - {site}',
});

export function updateTabTitle(title) {
  let siteName = titleStrings.$tr(window.libraryMode ? 'catalogTitle' : 'defaultTitle');
  if (title) {
    document.title = titleStrings
      .$tr('tabTitle')
      .replace('{title}', title)
      .replace('{site}', siteName);
  } else {
    document.title = siteName;
  }
}
