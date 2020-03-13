import { mapGetters } from 'vuex';
import { createTranslator } from 'utils/i18n';

const KB = parseFloat(1024);
const MB = parseFloat(Math.pow(KB, 2));
const GB = parseFloat(Math.pow(KB, 3));
const TB = parseFloat(Math.pow(KB, 4));

const sizeStrings = createTranslator('SizeStrings', {
  bytes: '{size} B',
  kilobytes: '{size} KB',
  megabytes: '{size} MB',
  gigabytes: '{size} GB',
  terabytes: '{size} TB',
  uploadFileSize: '{uploaded} of {total}',
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

export const fileStatusMixin = {
  mixins: [fileSizeMixin],
  computed: {
    ...mapGetters('file', ['getStatusMessage', 'getProgress']),
  },
  methods: {
    statusMessage(fileIDs) {
      let errorMessage = this.getStatusMessage(fileIDs);
      if (errorMessage) {
        return errorMessage;
      }
      let progress = this.getProgress(fileIDs);
      if (progress.total) {
        return this.sizeStrings('uploadFileSize')
          .replace('{uploaded}', this.formatFileSize(progress.uploaded))
          .replace('{total}', this.formatFileSize(progress.total));
      }
    },
  },
};
