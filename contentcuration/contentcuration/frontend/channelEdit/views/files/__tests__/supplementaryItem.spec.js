import { render, screen, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import SupplementaryItem from '../supplementaryLists/SupplementaryItem';
import { factory } from '../../../store';

configure({ testIdAttribute: 'data-test' });

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
      ...props,
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

  it('shows an upload status indicator while a file is uploading', () => {
    renderComponent({ progress: 0.5 });
    expect(screen.queryByTestId('uploading')).toBeInTheDocument();
  });

  it('should disable ability to upload other files during a file upload', () => {
    renderComponent({ progress: 0.5 });
    expect(screen.queryByTestId('upload-file')).not.toBeInTheDocument();
  });

  it('clicking remove button should emit remove event with file id', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({ id: 'test-remove' });
    await user.click(screen.getByTestId('remove'));
    expect(emitted().remove[0][0]).toBe('test-remove');
  });
});
