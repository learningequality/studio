import { render, fireEvent, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioCopyToken from '../Account/StudioCopyToken.vue';

function makeWrapper(props = {}) {
  const mockStore = {
    dispatch: jest.fn(),
  };

  return {
    ...render(StudioCopyToken, {
      props: {
        token: 'testtoken',
        ...props,
      },
      routes: new VueRouter({}),
      mocks: {
        $store: mockStore,
        $tr: key => key,
      },
    }),
    mockStore,
  };
}

describe('StudioCopyToken', () => {
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
    const { mockStore } = makeWrapper();
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(mockStore.dispatch).toHaveBeenCalledWith('showSnackbarSimple', 'tokenCopied');
  });

  it('dispatches snackbar on failed copy', async () => {
    const writeText = jest.fn().mockRejectedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    const { mockStore } = makeWrapper();
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(mockStore.dispatch).toHaveBeenCalledWith('showSnackbarSimple', 'tokenCopyFailed');
  });

  it('dispatches snackbar if token is empty', async () => {
    const { mockStore } = makeWrapper({ token: '   ' });
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(mockStore.dispatch).toHaveBeenCalledWith('showSnackbarSimple', 'tokenCopyFailed');
  });

  it('renders the copy button in the innerAfter slot', () => {
    const { container } = makeWrapper();
    const button = container.querySelector('.inner-after .copy-button');
    expect(button).toBeInTheDocument();
  });
});
