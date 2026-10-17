import { render, screen, within, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import InteractionSection from '../index.vue';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
  MATCH_THREE_SETS_XML,
  CHOICE_SINGLE_DECL_XML,
  TEXT_ENTRY_BODY_XML,
  TEXT_ENTRY_NUMERIC_DECL_XML,
  TEXT_ENTRY_STRING_DECL_XML,
  mockInteractionBlock as interactionBlock,
  mockInteractionBlockWithDecl,
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

// jest_config/setup.js adds a hidden csrf input to the document.
const isAuthorInput = el => el.name !== 'csrfmiddlewaretoken';

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
    props: {
      initial: {
        type: Object,
        default: () => interactionBlock(CHOICE_SINGLE_SELECT_XML),
      },
      language: {
        type: String,
        default: '',
      },
    },
    template: `
      <InteractionSection
        mode="edit"
        :interaction="interactionBlock"
        :language="language"
        @update:interaction="onUpdate"
      />
    `,
    data() {
      return { interactionBlock: this.initial };
    },
    methods: {
      onUpdate(val) {
        this.interactionBlock = val;
        this.$emit('wrapper-update', val);
      },
    },
  };

  const renderSwitchable = (initial, { language } = {}) =>
    render(SwitchableSection, {
      props: { ...(initial && { initial }), ...(language !== undefined && { language }) },
      routes: new VueRouter(),
    });

  const selector = () => screen.getByRole('group', { name: tr.$tr('typeLabel') });
  const shownType = () => selector().querySelector('.select-value-text').textContent.trim();

  async function pickType(user, toLabel) {
    await user.click(selector().querySelector('.select-value-text'));
    await user.click(screen.getAllByText(tr.$tr(toLabel)).at(-1));
    await nextTick();
  }

  // Mercury, marked correct, with Venus and Earth.
  const markedSingleSelect = () =>
    mockInteractionBlockWithDecl(CHOICE_SINGLE_SELECT_XML, CHOICE_SINGLE_DECL_XML);

  describe('type switching', () => {
    it('switches straight away when nothing would be lost', async () => {
      const user = userEvent.setup();
      const { emitted } = renderSwitchable(markedSingleSelect());
      await nextTick();

      await pickType(user, 'multiSelectLabel');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const switched = emitted()['wrapper-update'].at(-1)[0];
      expect(switched.responseDeclarations[0]).toContain('cardinality="multiple"');
      const answers = screen.getByRole('group', { name: tr.$tr('answersLabel') });
      const checkboxes = within(answers).getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      expect(checkboxes[0]).toBeChecked();
    });

    it('asks first when the change would remove part of the question', async () => {
      const user = userEvent.setup();
      renderSwitchable(markedSingleSelect());
      await nextTick();

      await pickType(user, 'textEntryLabel');

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(tr.$tr('incorrectAnswersRemovedLoss'))).toBeInTheDocument();
      expect(
        within(dialog).getByText(
          tr.$tr('changeQuestionTypeIntro', { type: tr.$tr('textEntryLabel') }),
        ),
      ).toBeInTheDocument();
    });

    it('converts the question once the author confirms', async () => {
      const user = userEvent.setup();
      const { emitted } = renderSwitchable(markedSingleSelect());
      await nextTick();

      await pickType(user, 'textEntryLabel');
      await user.click(screen.getByRole('button', { name: tr.$tr('changeQuestionTypeAction') }));
      await nextTick();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const switched = emitted()['wrapper-update'].at(-1)[0];
      expect(switched.bodyXml).toContain('Which planet is closest to the Sun?');
      expect(switched.bodyXml).toContain('<qti-text-entry-interaction');
      // The correct choice is now the accepted answer; the wrong ones are gone.
      expect(switched.responseDeclarations[0]).toContain('Mercury');
      expect(switched.responseDeclarations[0]).not.toContain('Venus');
      expect(screen.getByDisplayValue('Mercury')).toBeInTheDocument();
    });

    it('leaves the question as it was when the author cancels', async () => {
      const user = userEvent.setup();
      const { emitted } = renderSwitchable(markedSingleSelect());
      await nextTick();
      const before = emitted()['wrapper-update']?.length ?? 0;

      await pickType(user, 'textEntryLabel');
      await user.click(screen.getByRole('button', { name: tr.$tr('cancelAction') }));
      await nextTick();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(emitted()['wrapper-update']?.length ?? 0).toBe(before);
      expect(shownType()).toBe(tr.$tr('singleSelectLabel'));
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('asks again when the author picks the same type after cancelling', async () => {
      const user = userEvent.setup();
      renderSwitchable(markedSingleSelect());
      await nextTick();

      await pickType(user, 'textEntryLabel');
      await user.click(screen.getByRole('button', { name: tr.$tr('cancelAction') }));
      await nextTick();
      await pickType(user, 'textEntryLabel');

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    describe('focus', () => {
      // A rich text editor focusing itself does so in a timeout and then an animation frame, as
      // TipTap does, while the mock would at once. Timed like the real one, an editor remounted
      // for the new type that took focus again would show here, after the select.
      beforeEach(() => {
        const focus = HTMLTextAreaElement.prototype.focus;
        jest.spyOn(HTMLTextAreaElement.prototype, 'focus').mockImplementation(function () {
          setTimeout(() => requestAnimationFrame(() => focus.call(this)));
        });
      });

      afterEach(() => {
        HTMLTextAreaElement.prototype.focus.mockRestore();
      });

      const settle = () =>
        new Promise(resolve => setTimeout(() => requestAnimationFrame(() => setTimeout(resolve))));

      it('stays on the type selector after a switch with nothing to confirm', async () => {
        const user = userEvent.setup();
        renderSwitchable(markedSingleSelect());
        await nextTick();

        // From choice to free response, then on to text entry, which loses nothing.
        await pickType(user, 'freeResponseLabel');
        await user.click(screen.getByRole('button', { name: tr.$tr('changeQuestionTypeAction') }));
        await settle();
        await pickType(user, 'textEntryLabel');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await settle();

        expect(selector()).toContainElement(document.activeElement);
      });

      it.each([
        ['confirming', 'changeQuestionTypeAction'],
        ['cancelling', 'cancelAction'],
      ])('goes back to the type selector after %s', async (_, button) => {
        const user = userEvent.setup();
        renderSwitchable(markedSingleSelect());
        await nextTick();

        await pickType(user, 'textEntryLabel');
        await user.click(screen.getByRole('button', { name: tr.$tr(button) }));
        await settle();

        expect(selector()).toContainElement(document.activeElement);
      });
    });

    it('converts what the author has just typed', async () => {
      const user = userEvent.setup();
      const { emitted } = renderSwitchable(markedSingleSelect());
      await nextTick();

      await user.click(
        screen.getByRole('button', { name: tr.$tr('editAnswerOptionLabel', { number: 1 }) }),
      );
      const mercury = screen.getByDisplayValue('Mercury');
      await user.clear(mercury);
      await user.type(mercury, 'Mercury, the smallest planet');
      await pickType(user, 'multiSelectLabel');

      expect(emitted()['wrapper-update'].at(-1)[0].bodyXml).toContain(
        'Mercury, the smallest planet',
      );
    });

    it('produces a match item that reopens in the match editor', async () => {
      const user = userEvent.setup();
      const { emitted, unmount } = renderSwitchable();
      await nextTick();

      await pickType(user, 'matchLabel');
      expect(
        within(screen.getByRole('dialog')).getByText(tr.$tr('answersRemovedLoss')),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: tr.$tr('changeQuestionTypeAction') }));
      await nextTick();

      const switched = emitted()['wrapper-update'].at(-1)[0];
      expect(switched.bodyXml).toContain('Which planet is closest to the Sun?');
      expect(switched.bodyXml.match(/<qti-simple-match-set/g)).toHaveLength(2);
      expect(switched.bodyXml).not.toContain('Mercury');

      unmount();
      renderSection({ interaction: switched });
      expect(screen.getByRole('button', { name: tr.$tr('addRowBtn') })).toBeInTheDocument();
    });
  });

  // Changing the question type remounts the editor on the converted question, so numbers move
  // between how the exercise language writes them and how they are stored as it opens.
  describe('numeric answers across a type change', () => {
    const numericAnswers = () =>
      screen.queryAllByRole('textbox', { name: tr.$tr('answerValuePlaceholder') });
    const latestDeclaration = emitted =>
      emitted()['wrapper-update'].at(-1)[0].responseDeclarations[0];
    const numeric = stored =>
      mockInteractionBlockWithDecl(
        TEXT_ENTRY_BODY_XML,
        TEXT_ENTRY_NUMERIC_DECL_XML.replace('42', stored),
      );
    const textEntry = text =>
      mockInteractionBlockWithDecl(
        TEXT_ENTRY_BODY_XML,
        TEXT_ENTRY_STRING_DECL_XML.replace('H2O', text),
      );

    it.each([
      ['fr', '1234.5'],
      ['en', '1.50'],
      ['en', '0012'],
      ['ar-EG', '30'],
      ['ar-EG', '-3.14'],
      ['fr', '1.2.3'],
      ['he', '-0.5'],
      ['sv', '-0.5'],
      ['ar-EG', '-0.5'],
    ])('gives text entry a numeric answer as it was shown in %s (%s)', async (language, stored) => {
      const user = userEvent.setup();
      const { emitted } = renderSwitchable(numeric(stored), { language });
      await nextTick();
      const shown = numericAnswers()[0].value;
      await pickType(user, 'textEntryLabel');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(latestDeclaration(emitted)).toContain(`<qti-value>${shown}</qti-value>`);
    });

    it.each([
      ['fr', '11,2'],
      ['de', '1.234,5'],
      ['en', '1.5'],
    ])(
      'gives back a text entry answer in %s (%s) after switching to numeric and back',
      async (language, text) => {
        const user = userEvent.setup();
        const { emitted } = renderSwitchable(textEntry(text), { language });
        await nextTick();
        await pickType(user, 'numericLabel');
        await nextTick();
        const shown = numericAnswers()[0].value;
        await pickType(user, 'textEntryLabel');
        expect(latestDeclaration(emitted)).toContain(`<qti-value>${shown}</qti-value>`);
      },
    );

    it.each([
      ['fr', '1,5', '1,5', '1.5'],
      ['fr', '1 234,5', '1234,5', '1234.5'],
      // Read as xsd:double first, as German would read it as 15.
      ['de', '1.5', '1,5', '1.5'],
    ])(
      'reads a text entry answer in %s (%s) when switched to numeric',
      async (language, text, shown, stored) => {
        const user = userEvent.setup();
        const { emitted } = renderSwitchable(textEntry(text), { language });
        await nextTick();
        await pickType(user, 'numericLabel');
        await nextTick();
        expect(numericAnswers()[0]).toHaveValue(shown);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(latestDeclaration(emitted)).toContain(`<qti-value>${stored}</qti-value>`);
      },
    );

    it.each([
      ['de', '1.5', '1,5'],
      ['es', '1234.5', '1234,5'],
      ['fr', '1234.5', '1234,5'],
      ['ar-EG', '30', '٣٠'],
    ])(
      'shows a stored answer in %s again after switching to text entry and back (%s)',
      async (language, stored, shown) => {
        const user = userEvent.setup();
        const { emitted } = renderSwitchable(numeric(stored), { language });
        await nextTick();
        await pickType(user, 'textEntryLabel');
        await pickType(user, 'numericLabel');
        await nextTick();
        expect(numericAnswers()[0]).toHaveValue(shown);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(latestDeclaration(emitted)).toContain(`<qti-value>${stored}</qti-value>`);
      },
    );

    it.each([
      ['fr', '1,5'],
      ['en', '1,234'],
      ['de', '1.500'],
      ['', ' 5 '],
      ['fa', 'می\u200cخواهم'],
      ['en', 'a\u00adb'],
    ])(
      'gives text entry a typed numeric answer as it is shown in "%s" (%s)',
      async (language, typed) => {
        const user = userEvent.setup();
        const { emitted } = renderSwitchable(numeric('42'), { language });
        await nextTick();
        const [input] = numericAnswers();
        await fireEvent.input(input, { target: { value: typed } });
        // Leaving the answer shows it as stored, written in the language.
        await fireEvent.blur(input);
        const shown = input.value;
        await pickType(user, 'textEntryLabel');
        expect(latestDeclaration(emitted)).toContain(`<qti-value>${shown.trim()}</qti-value>`);
      },
    );
  });

  describe('unknown interaction type', () => {
    it('renders nothing editable', () => {
      renderSection({ interaction: interactionBlock(UNKNOWN_INTERACTION_XML), mode: 'edit' });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('textbox').filter(isAuthorInput)).toHaveLength(0);
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });
  });
});
