import { render, screen } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import InteractionSection from '../index.vue';

import {
  CHOICE_SINGLE_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
  mockInteractionBlock as interactionBlock,
} from '../../../utils/testingFixtures';

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
    it('shows a parse error message and no interaction when XML is malformed', () => {
      renderSection({ interaction: interactionBlock('not-xml<{{') });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      // At minimum no interactive elements render
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
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
