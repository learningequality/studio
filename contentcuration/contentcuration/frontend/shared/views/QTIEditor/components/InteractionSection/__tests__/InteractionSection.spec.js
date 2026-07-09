import { render, screen } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import InteractionSection from '../index.vue';

import {
  CHOICE_SINGLE_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
  mockInteractionBlock as interactionBlock,
} from '../../../utils/testingFixtures';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');

const renderSection = (props = {}) =>
  render(InteractionSection, {
    props: { mode: 'edit', ...props },
    routes: new VueRouter(),
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InteractionSection', () => {
  describe('choice interaction', () => {
    it('renders the prompt from the XML via ChoiceInteractionEditor', () => {
      renderSection({ interaction: interactionBlock(CHOICE_SINGLE_SELECT_XML) });
      expect(screen.getByText('Which planet is closest to the Sun?')).toBeInTheDocument();
    });

    it('renders radio buttons for a single-select choice interaction', async () => {
      renderSection({ interaction: interactionBlock(CHOICE_SINGLE_SELECT_XML) });
      await nextTick();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('renders the choice labels', () => {
      renderSection({ interaction: interactionBlock(CHOICE_SINGLE_SELECT_XML) });
      expect(screen.getByText('Mercury')).toBeInTheDocument();
      expect(screen.getByText('Venus')).toBeInTheDocument();
    });
  });

  describe('parse error handling', () => {
    it('gracefully falls back to default interaction state when XML is malformed', () => {
      renderSection({ interaction: interactionBlock('not-xml<{{') });
      // It should render exactly 1 choice fallback element
      const inputs = screen.queryAllByRole('radio').concat(screen.queryAllByRole('checkbox'));
      expect(inputs).toHaveLength(1);
    });
  });

  describe('unknown interaction type', () => {
    it('falls back silently when the interaction tag is unrecognized', () => {
      // Should not throw — just renders the fallback component
      expect(() =>
        renderSection({ interaction: interactionBlock(UNKNOWN_INTERACTION_XML) }),
      ).not.toThrow();
    });
  });
});
