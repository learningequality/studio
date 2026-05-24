import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import SupplementaryItem from '../supplementaryLists/SupplementaryItem';
import { factory } from '../../../store';
import VueRouter from 'vue-router';
const router = new VueRouter();

function renderComponent(props = {}) {
  const store = factory();
  return render(SupplementaryItem, {
    router,
    store,
    attachTo: document.body,
    props: {
      fileId: 'test',
      presetID: 'video_subtitle',
      ...props
    },
    computed: {
      file() {
        return {
          id: 'test',
          language: {
            id: 'en',
          },
          uploading: props.progress < 1,
          ...props,
        };
      },
    },
  });
}

describe('supplementaryItem', () => {
  it('setting readonly should disable uploading', () => {
    renderComponent({ readonly: true });
    expect(screen.queryByTestId('upload-file')).not.toBeInTheDocument();
  });

  it('setting readonly should disable removing', () => {
    renderComponent({ readonly: true });
    expect(screen.queryByTestId('remove')).not.toBeInTheDocument();
  });

  // it('should call uploadingHandler when Uploader starts uploading file', () => {
  //   wrapper.findComponent(Uploader).vm.uploadingHandler({ id: 'file1' });
  //   expect(wrapper.vm.fileUploadId).toBe('file1');
  // });

  it('should call uploadCompleteHandler when Uploader finishes uploading file', () => {
    const uploadCompleteHandler = jest.fn();
    renderComponent({ uploadCompleteHandler });
    uploadCompleteHandler({ id: 'file1' });
    expect(uploadCompleteHandler).toHaveBeenCalledWith({ id: 'file1' });
  });

  it('uploading should be true if progress < 1', () => {
    renderComponent({ progress: 0.5 });
    expect(document.querySelector('[data-test="uploading"]')).toBeInTheDocument();
  });

  it('should disable ability to upload other files during a file upload', () => {
    renderComponent({ progress: 0.5 });
    expect(screen.queryByTestId('upload-file')).not.toBeInTheDocument();
  });

  it('clicking remove button should emit remove event with file id', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({ id: 'test-remove' });
    await user.click(document.querySelector('[data-test="remove"]'));
    expect(emitted().remove[0][0]).toBe('test-remove');
  });
});
