import { render, fireEvent, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';
import StudioCopyToken from '../index.vue';

function makeWrapper(props = {}) {
  return render(StudioCopyToken, {
    props: {
      token: 'testtoken',
      ...props,
    },
    routes: new VueRouter({}),
    mocks: {
      $tr: key => key,
    },
  });
}

describe('StudioCopyToken', () => {
  let originalClipboard;

  beforeEach(() => {
    useKSnackbar().clearSnackbar();
  });

  beforeAll(() => {
    originalClipboard = navigator.clipboard;
  });

  afterAll(() => {
    navigator.clipboard = originalClipboard;
  });

  it('displays hyphenated token by default', () => {
    makeWrapper();
    const input = screen.getByDisplayValue('testt-oken');
    expect(input).toBeInTheDocument();
  });

  it('displays token without hyphen if hyphenate is false', () => {
    makeWrapper({ hyphenate: false });
    const input = screen.getByDisplayValue('testtoken');
    expect(input).toBeInTheDocument();
  });

  it('shows loader when loading is true', () => {
    const { container } = makeWrapper({ loading: true });
    expect(container.querySelector('.ui-progress-circular')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/test/)).not.toBeInTheDocument();
  });

  it('should fire a copy operation on button click', async () => {
    const writeText = jest.fn().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    makeWrapper();
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testt-oken');
  });

  it('dispatches snackbar on successful copy', async () => {
    const writeText = jest.fn().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    makeWrapper();
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(useKSnackbar().snackbarOptions.value.text).toBe('copiedTokenId');
  });

  it('dispatches snackbar on failed copy', async () => {
    const writeText = jest.fn().mockRejectedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    makeWrapper();
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(useKSnackbar().snackbarOptions.value.text).toBe('copyFailed');
  });

  it('renders the copy button', () => {
    const { container } = makeWrapper();
    const button = container.querySelector('.copy-button');
    expect(button).toBeInTheDocument();
  });

  it('disables the copy button if token is empty', () => {
    const { container } = makeWrapper({ token: '   ' });
    const button = container.querySelector('.copy-button');
    expect(button).toBeDisabled();
  });
});
