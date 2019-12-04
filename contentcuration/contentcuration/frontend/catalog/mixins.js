import Constants from 'edit_channel/constants/index';
import { createTranslator } from 'utils/i18n';

const KB = parseFloat(1024);
const MB = parseFloat(Math.pow(KB, 2));
const GB = parseFloat(Math.pow(KB, 3));
const TB = parseFloat(Math.pow(KB, 4));

const sizeStrings = createTranslator('SizeStrings', {
  bytes: '{size}B',
  kilobytes: '{size}KB',
  megabytes: '{size}MB',
  gigabytes: '{size}GB',
  terabytes: '{size}TB',
});

export const fileSizeMixin = {
  computed: {
    sizeStrings() {
      return sizeStrings;
    },
  },
  methods: {
    formatFileSize(size) {
      // createTranslator doesn't support string arguments, so use replace for now
      size = size || 0;
      let absoluteValueSize = Math.abs(size);
      if (absoluteValueSize < KB) {
        return this.sizeStrings('bytes').replace('{size}', Math.round(size));
      } else if (KB <= absoluteValueSize && absoluteValueSize < MB) {
        return this.sizeStrings('kilobytes').replace('{size}', Math.round(parseFloat(size / KB)));
      } else if (MB <= absoluteValueSize && absoluteValueSize < GB) {
        return this.sizeStrings('megabytes').replace('{size}', Math.round(parseFloat(size / MB)));
      } else if (GB <= absoluteValueSize && absoluteValueSize < TB) {
        return this.sizeStrings('gigabytes').replace('{size}', Math.round(parseFloat(size / GB)));
      } else {
        return this.sizeStrings('terabytes').replace('{size}', Math.round(parseFloat(size / TB)));
      }
    },
  },
};

const constantStrings = createTranslator('ConstantStrings', {
  topic: 'Topic',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  exercise: 'Exercise',
  html5: 'HTML5 App',
});

export const constantsTranslationMixin = {
  computed: {
    constantStrings() {
      return constantStrings;
    },
  },
  methods: {
    translateConstant(constant) {
      return this.constantStrings(constant);
    },
    translateLanguage(language) {
      let lang = Constants.Languages.find(l => l.id === language);
      return lang && lang.native_name;
    },
  },
};
