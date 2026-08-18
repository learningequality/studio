import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import HintsSection from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

const {
  hintsLabel$,
  noHintsPlaceholder$,
  hintPlaceholder$,
  editHintLabel$,
  addHintBtn$,
  deleteHintBtn$,
  moveHintUpBtn$,
  moveHintDownBtn$,
} = qtiEditorStrings;

const HINTS = [
  { id: 'hint_a', content: '<p>test</p>' },
  { id: 'hint_b', content: '<p>test2 2</p>' },
  { id: 'hint_c', content: '<p>test3 3</p>' },
];

const renderComponent = (props = {}) =>
  render(HintsSection, {
    props: { hints: HINTS, mode: 'edit', ...props },
    routes: new VueRouter(),
  });

const expand = async () => {
  await fireEvent.click(screen.getByRole('button', { name: hintsLabel$() }));
};

describe('HintsSection', () => {
  it('starts collapsed, showing only the header', () => {
    renderComponent();
    expect(screen.getByText(hintsLabel$())).toBeInTheDocument();
    expect(screen.queryAllByTestId('hint')).toHaveLength(0);
  });

  it('lists the hints once expanded', async () => {
    renderComponent();
    await expand();
    expect(screen.getAllByTestId('hint')).toHaveLength(3);
  });

  it('reports the section as expanded to assistive technology', async () => {
    renderComponent();
    const toggle = screen.getByRole('button', { name: hintsLabel$() });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expand();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('says so when the question has no hints left', async () => {
    renderComponent({ hints: [] });
    await expand();
    expect(screen.getByText(noHintsPlaceholder$())).toBeInTheDocument();
  });

  it('shows a placeholder for a hint with nothing written in it', async () => {
    renderComponent({ hints: [{ id: 'hint_a', content: '' }] });
    await expand();
    expect(screen.getByText(hintPlaceholder$({ index: 1 }))).toBeInTheDocument();
  });

  describe('editing', () => {
    it('appends an empty hint', async () => {
      const { emitted } = renderComponent();
      await expand();
      await fireEvent.click(screen.getByRole('button', { name: addHintBtn$() }));

      const [hints] = emitted()['update:hints'].at(-1);
      expect(hints).toHaveLength(4);
      expect(hints[3].content).toBe('');
    });

    it('removes the hint whose delete action was used', async () => {
      const { emitted } = renderComponent();
      await expand();
      await fireEvent.click(screen.getAllByRole('button', { name: deleteHintBtn$() })[1]);

      const [hints] = emitted()['update:hints'].at(-1);
      expect(hints.map(h => h.id)).toEqual(['hint_a', 'hint_c']);
    });

    it('moves a hint up', async () => {
      const { emitted } = renderComponent();
      await expand();
      await fireEvent.click(screen.getAllByRole('button', { name: moveHintUpBtn$() })[2]);

      const [hints] = emitted()['update:hints'].at(-1);
      expect(hints.map(h => h.id)).toEqual(['hint_a', 'hint_c', 'hint_b']);
    });

    it('moves a hint down', async () => {
      const { emitted } = renderComponent();
      await expand();
      await fireEvent.click(screen.getAllByRole('button', { name: moveHintDownBtn$() })[0]);

      const [hints] = emitted()['update:hints'].at(-1);
      expect(hints.map(h => h.id)).toEqual(['hint_b', 'hint_a', 'hint_c']);
    });

    it('cannot move the first hint up or the last one down', async () => {
      renderComponent();
      await expand();
      expect(screen.getAllByRole('button', { name: moveHintUpBtn$() })[0]).toBeDisabled();
      expect(screen.getAllByRole('button', { name: moveHintDownBtn$() })[2]).toBeDisabled();
    });
  });

  describe('opening a hint from the keyboard', () => {
    it('reaches each hint through a button that names which one it is', async () => {
      renderComponent();
      await expand();
      expect(
        screen.getByRole('button', { name: editHintLabel$({ number: 2 }) }),
      ).toBeInTheDocument();
    });

    it('opens the hint that button belongs to, and stops offering it', async () => {
      renderComponent();
      await expand();
      await fireEvent.click(screen.getByRole('button', { name: editHintLabel$({ number: 2 }) }));
      expect(
        screen.queryByRole('button', { name: editHintLabel$({ number: 2 }) }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: editHintLabel$({ number: 1 }) }),
      ).toBeInTheDocument();
    });
  });

  describe('view mode', () => {
    it('offers no way to change the hints', async () => {
      renderComponent({ mode: 'view' });
      await expand();
      expect(screen.getAllByTestId('hint')).toHaveLength(3);
      expect(screen.queryByRole('button', { name: addHintBtn$() })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: deleteHintBtn$() })).not.toBeInTheDocument();
    });

    it('offers no clickable region for a hint that cannot be edited', async () => {
      renderComponent({ mode: 'view' });
      await expand();
      expect(
        screen.queryByRole('button', { name: editHintLabel$({ number: 1 }) }),
      ).not.toBeInTheDocument();
    });
  });
});
