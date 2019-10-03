import { fileErrors } from './constants';
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

const fileErrorStrings = createTranslator('FileErrorStrings', {
  [fileErrors.NO_STORAGE]: 'Out of storage',
  noStorageAction: 'Request',
  [fileErrors.WRONG_TYPE]: 'Invalid file type (must be {filetypes})',
  [fileErrors.TOO_LARGE]: 'File too large. Must be under 500MB',
  [fileErrors.UPLOAD_FAILED]: 'Upload failed',
  fileUploadAction: 'Retry',
  [fileErrors.URL_EXPIRED]: 'Upload failed',
});

export const fileErrorMixin = {
  computed: {
    fileErrorStrings() {
      return fileErrorStrings;
    },
  },
  methods: {
    getFileErrorMessage(files) {
      let firstFile = _.find(files, file => file.error);
      if (firstFile) {
        let errorData = {
          message: this.fileErrorStrings(firstFile.error),
        };
        switch (firstFile.error) {
          case fileErrors.NO_STORAGE:
            errorData.action = this.fileErrorStrings('noStorageAction');
            errorData.url = window.Urls.storage_settings();
            break;
          case fileErrors.WRONG_TYPE:
            errorData.messages.replace('{filetypes}', '');
            break;
        }
        return errorData;
      }
    },
  },
};
