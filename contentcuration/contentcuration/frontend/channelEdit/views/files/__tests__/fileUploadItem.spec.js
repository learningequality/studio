import { render, screen, waitFor, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import FileUploadItem from '../FileUploadItem';
import { factory } from '../../../store';
import Uploader from 'shared/views/files/Uploader';
import { fileErrors } from 'shared/constants';
import { createTranslator } from 'shared/i18n';

configure({ testIdAttribute: 'data-test' });

jest.mock('shared/vuex/file/validation', () => ({
  validateFile: jest.fn(() => Promise.resolve(0)),
}));

const tr = createTranslator('FileUploadItem', FileUploadItem.$trs);
const testFile = { id: 'test' };

function renderComponent({ props = {}, file = {}, store = factory() } = {}) {
  return render(FileUploadItem, {
    routes: [],
    store,
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
      const store = factory();
      store.commit('ADD_SESSION', { id: 1, disk_space: 209715200, disk_space_used: 0 });

      const uploadCompleteHandler = jest.fn();
      const fileObject = {
        id: 'file-1',
        preset: 'document',
        checksum: 'checksum',
        file_format: 'pdf',
        original_filename: 'test.pdf',
        loaded: 0,
        total: 10,
      };

      const uploadFile = jest
        .spyOn(Uploader.methods, 'uploadFile')
        .mockImplementation(async () => {
          store.commit('file/ADD_FILE', fileObject);
          return { fileObject, uploadPromise: Promise.resolve(fileObject) };
        });

      renderComponent({
        store,
        props: {
          uploadCompleteHandler,
        },
      });

      const fileInput = screen.getByTestId('upload-dialog');
      await userEvent.upload(
        fileInput,
        new File(['pdf'], 'test.pdf', { type: 'application/pdf' }),
      );

      await waitFor(() => {
        expect(uploadCompleteHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'file-1',
          }),
        );
      });

      uploadFile.mockRestore();
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
      const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click');

      const { emitted } = renderComponent({
        file: null,
      });

      await user.click(screen.getByText(tr.$tr('uploadButton')));

      expect(clickSpy).toHaveBeenCalled();
      expect(emitted()).not.toHaveProperty('selected');

      clickSpy.mockRestore();
    });
  });
});
