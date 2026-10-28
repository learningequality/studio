import { render, screen, within, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';
import GlobalSnackbar from '../GlobalSnackbar.vue';

describe('GlobalSnackbar', () => {
  let actionCallback;
  let hideCallback;

  beforeEach(() => {
    actionCallback = jest.fn();
    hideCallback = jest.fn();
    const { clearSnackbar } = useKSnackbar();
    clearSnackbar();
  });

  function renderComponent() {
    return render(GlobalSnackbar, {
      routes: new VueRouter(),
    });
  }

  it('renders the snackbar text', async () => {
    const { createSnackbar } = useKSnackbar();
    createSnackbar({ text: 'Test Snackbar', announce: true });
    renderComponent();

    const snackbar = screen.getByTestId('snackbar');
    expect(snackbar).toBeInTheDocument();
    expect(within(snackbar).getByText('Test Snackbar')).toBeInTheDocument();
  });

  it('renders the snackbar action correctly', async () => {
    const { createSnackbar } = useKSnackbar();
    createSnackbar({ text: 'Test Snackbar', actionText: 'Action', announce: true });
    renderComponent();

    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('clicking the action calls the action callback and closes the snackbar', async () => {
    const { createSnackbar, snackbarIsVisible } = useKSnackbar();
    createSnackbar({
      text: 'Test Snackbar',
      actionText: 'Action',
      actionCallback,
      hideCallback,
      announce: true,
    });
    renderComponent();

    const actionButton = screen.getByRole('button', { name: 'Action' });
    await fireEvent.click(actionButton);

    expect(actionCallback).toHaveBeenCalledTimes(1);
    expect(hideCallback).toHaveBeenCalledTimes(1);
    expect(snackbarIsVisible.value).toBe(false);
  });

  it('closing the snackbar calls hideCallback exactly once when provided', async () => {
    const { createSnackbar, snackbarIsVisible } = useKSnackbar();
    createSnackbar({
      text: 'Test Snackbar',
      hideCallback,
      announce: true,
    });
    renderComponent();

    const snackbar = screen.getByTestId('snackbar');
    await fireEvent.keyDown(snackbar, { key: 'Escape' });

    expect(hideCallback).toHaveBeenCalledTimes(1);
    expect(snackbarIsVisible.value).toBe(false);
  });
});
