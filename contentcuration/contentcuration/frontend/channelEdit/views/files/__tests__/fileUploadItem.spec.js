import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import FileUploadItem from '../FileUploadItem';
import { factory } from '../../../store';
import { fileErrors } from 'shared/constants';
import { createTranslator } from 'shared/i18n';

const tr = createTranslator('FileUploadItem', FileUploadItem.$trs);
const testFile = { id: 'test' };

function renderComponent({ props = {}, file = {}, store = factory(), stubs = {} } = {}) {
  return render(FileUploadItem, {
    routes: [],
    store,
    stubs,
    props: {
      file:
        file === null
          ? null
          : {
              ...testFile,
              ...file,
            },
      preset: {
        id: 'document',
        kind_id: 'document',
        display: true,
      },
      ...props,
    },
  });
}

describe('fileUploadItem', () => {
  describe('render', () => {
    it('shows "Unknown filename" when the uploaded file has a generic name', () => {
      renderComponent({
        file: {
          original_filename: 'file',
        },
      });
      expect(screen.getByText(tr.$tr('unknownFile'))).toBeInTheDocument();
    });

    it("shows 'Unknown filename' when the uploaded filename is ''", () => {
      renderComponent({
        file: {
          original_filename: '',
        },
      });
      expect(screen.getByText(tr.$tr('unknownFile'))).toBeInTheDocument();
    });

    it('shows the uploaded file name when it is available', () => {
      renderComponent({
        file: {
          original_filename: 'SomeFileName',
        },
      });
      expect(screen.getByText('SomeFileName')).toBeInTheDocument();
    });

    it('shows an upload error when the file upload failed', () => {
      const store = factory();
      store.commit('file/ADD_FILE', {
        id: 'file-1',
        original_filename: 'SomeFileName',
        preset: 'document',
        checksum: 'checksum',
        file_format: 'pdf',
        loaded: 0,
        total: 100,
        error: fileErrors.UPLOAD_FAILED,
      });
      renderComponent({
        store,
        file: {
          id: 'file-1',
          original_filename: 'SomeFileName',
          error: fileErrors.UPLOAD_FAILED,
        },
      });
      expect(screen.getByText(tr.$tr('uploadFailed'))).toBeInTheDocument();
    });

    it('shows a Select file action when no file has been uploaded', () => {
      renderComponent({
        file: null,
      });
      expect(screen.getByText(tr.$tr('uploadButton'))).toBeInTheDocument();
    });

    it('shows file actions when the user opens the options menu', async () => {
      const user = userEvent.setup();
      renderComponent({
        props: {
          allowFileRemove: true,
        },
        file: {
          id: 'file-1',
          original_filename: 'SomeFileName',
          file_size: 100,
          url: 'file-url',
        },
      });
      await user.click(screen.getByRole('button', { name: tr.$tr('fileOptionsButtonLabel') }));
      expect(screen.getByText(tr.$tr('replaceFileMenuOptionLabel'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('downloadMenuOptionLabel'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('removeMenuOptionLabel'))).toBeInTheDocument();
    });

    it('calls the upload complete handler when the replacement upload finishes', async () => {
      const user = userEvent.setup();
      const uploadCompleteHandler = jest.fn();

      const UploaderStub = {
        name: 'Uploader',
        props: ['uploadingHandler', 'uploadCompleteHandler'],
        methods: {
          openFileDialog() {},
          handleFiles() {},
        },
        template: `
          <div>
            <button type="button" @click="uploadingHandler({ id: 'file-1' })">
              Start upload
            </button>
            <button type="button" @click="uploadCompleteHandler({ id: 'file-1' })">
              Finish upload
            </button>
            <slot :openFileDialog="openFileDialog" :handleFiles="handleFiles" />
          </div>
        `,
      };

      renderComponent({
        props: {
          uploadCompleteHandler,
        },
        stubs: {
          Uploader: UploaderStub,
        },
      });

      await user.click(screen.getByRole('button', { name: 'Start upload' }));
      await user.click(screen.getByRole('button', { name: 'Finish upload' }));

      expect(uploadCompleteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'file-1',
        }),
      );
    });

    it('selects the existing file when the user clicks the file row', async () => {
      const user = userEvent.setup();
      const { emitted } = renderComponent({
        file: {
          id: 'file-1',
          original_filename: 'SomeFileName',
          file_size: 100,
        },
      });

      await user.click(screen.getByText('SomeFileName'));

      expect(emitted().selected).toHaveLength(1);
    });

    it('opens the file chooser when the user clicks an empty file row', async () => {
      const user = userEvent.setup();
      const openFileDialog = jest.fn();

      const UploaderStub = {
        name: 'Uploader',
        methods: {
          openFileDialog() {
            openFileDialog();
          },
          handleFiles() {},
        },
        template: `
          <div>
            <slot :openFileDialog="openFileDialog" :handleFiles="handleFiles" />
          </div>
        `,
      };

      const { emitted } = renderComponent({
        file: null,
        stubs: {
          Uploader: UploaderStub,
        },
      });

      await user.click(screen.getByText(tr.$tr('uploadButton')));

      expect(openFileDialog).toHaveBeenCalled();
      expect(emitted()).not.toHaveProperty('selected');
    });
  });
});
