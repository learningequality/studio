import { render, screen, fireEvent, within } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import InteractionSection from '../index.vue';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
  MATCH_THREE_SETS_XML,
  mockInteractionBlock as interactionBlock,
} from '../../../utils/testingFixtures';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false), windowIsLarge: ref(true) }),
  };
});

const renderSection = (props = {}) =>
  render(InteractionSection, {
    props: { mode: 'edit', ...props },
    routes: new VueRouter(),
  });

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

    it('teleports answer settings into the question type selector header', async () => {
      renderSection({ interaction: interactionBlock(CHOICE_MULTI_SELECT_XML) });
      await nextTick();
      const targetDiv = document.querySelector('.answer-settings-group');
      expect(targetDiv).toBeInTheDocument();
      expect(
        within(targetDiv).getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') }),
      ).toBeInTheDocument();
    });
  });

  describe('parse error handling', () => {
    it('shows a parse error when XML is malformed', () => {
      renderSection({ interaction: interactionBlock('not-xml<{{') });
      expect(screen.getByText(tr.$tr('errorParsingQuestion'))).toBeInTheDocument();
    });

    it('shows a parse error for a match interaction without exactly two match sets', () => {
      renderSection({ interaction: interactionBlock(MATCH_THREE_SETS_XML) });
      expect(screen.getByText(tr.$tr('errorParsingQuestion'))).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: tr.$tr('addRowBtn') })).not.toBeInTheDocument();
    });
  });

  // Feeds each emitted interaction back in, as the item editor does.
  const SwitchableSection = {
    components: { InteractionSection },
    template: `
      <InteractionSection
        mode="edit"
        :interaction="interactionBlock"
        @update:interaction="onUpdate"
      />
    `,
    data() {
      return {
        interactionBlock: {
          bodyXml: CHOICE_SINGLE_SELECT_XML,
          responseDeclarations: [],
        },
      };
    },
    methods: {
      onUpdate(val) {
        this.interactionBlock = val;
        this.$emit('wrapper-update', val);
      },
    },
  };

  describe('type switching', () => {
    it('preserves the prompt but resets choices when switching from choice to text-entry', async () => {
      const { emitted } = render(SwitchableSection, {
        routes: new VueRouter(),
      });

      await nextTick();

      const selectedOption = screen.getAllByText(tr.$tr('singleSelectLabel'))[0];
      await fireEvent.click(selectedOption);

      const textEntryOption = screen.getByText(tr.$tr('textEntryLabel'));
      await fireEvent.click(textEntryOption);

      await nextTick();

      const emits = emitted()['wrapper-update'];
      const switchXml = emits.at(-1)[0].bodyXml;

      expect(switchXml).toContain('Which planet is closest to the Sun?');
      expect(switchXml).toContain('<qti-text-entry-interaction');
      expect(switchXml).not.toContain('Mercury');
    });
  });

  describe('switching to match', () => {
    it('produces a match item that reopens in the match editor', async () => {
      const { emitted, unmount } = render(SwitchableSection, { routes: new VueRouter() });
      await nextTick();

      await fireEvent.click(screen.getAllByText(tr.$tr('singleSelectLabel'))[0]);
      await fireEvent.click(screen.getByText(tr.$tr('matchLabel')));
      await nextTick();

      const switched = emitted()['wrapper-update'].at(-1)[0];
      expect(switched.bodyXml).toContain('Which planet is closest to the Sun?');
      expect(switched.bodyXml.match(/<qti-simple-match-set/g)).toHaveLength(2);

      unmount();
      renderSection({ interaction: switched });
      expect(screen.getByRole('button', { name: tr.$tr('addRowBtn') })).toBeInTheDocument();
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
