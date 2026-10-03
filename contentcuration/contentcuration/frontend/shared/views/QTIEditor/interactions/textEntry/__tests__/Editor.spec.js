import { render, screen, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import TextEntryEditor from '../Editor.vue';

import {
  TEXT_ENTRY_BODY_XML,
  TEXT_ENTRY_NUMERIC_DECL_XML as NUMERIC_DECL,
  TEXT_ENTRY_STRING_DECL_XML as STRING_DECL,
  TEXT_ENTRY_FREE_DECL_XML as FREE_DECL,
  mockInteractionBlock as block,
  mockInteractionBlockWithDecl as blockWithDecl,
} from '../../../utils/testingFixtures';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

const renderEditor = (props = {}) =>
  render(TextEntryEditor, {
    props: { mode: 'edit', ...props },
    routes: new VueRouter(),
  });

// The mock TipTapEditor renders a <textarea> only for the editor that is open.
const openTextarea = () => screen.queryAllByRole('textbox').find(el => el.tagName === 'TEXTAREA');

describe('TextEntryEditor — numeric', () => {
  const answerInputs = () =>
    screen.queryAllByRole('textbox', { name: tr.$tr('answerValuePlaceholder') });

  it('opens the question for editing when it is already written', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
    });
    expect(
      screen.queryByRole('button', { name: tr.$tr('editQuestionLabel') }),
    ).not.toBeInTheDocument();
    expect(openTextarea().value).toContain('What is H2O?');
  });

  describe('answer list', () => {
    it('renders one answer row per value in the declaration', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      expect(answerInputs().length).toBeGreaterThanOrEqual(1);
    });

    it('renders the Add acceptable answer button', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      expect(screen.getByRole('button', { name: tr.$tr('addAnswerBtn') })).toBeInTheDocument();
    });

    it('adds a new answer row when Add button is clicked', async () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      const before = answerInputs().length;
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addAnswerBtn') }));
      expect(answerInputs().length).toBe(before + 1);
    });

    it('renders a delete button for each answer row', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      expect(screen.getAllByRole('button', { name: /Delete answer/i })).toHaveLength(1);
    });

    it('disables delete when only one answer remains', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      expect(screen.getByRole('button', { name: /Delete answer/i })).toBeDisabled();
    });

    it('removes an answer row when delete is clicked (with 2+ rows)', async () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addAnswerBtn') }));
      expect(answerInputs().length).toBe(2);
      const deleteBtns = screen.getAllByRole('button', { name: /Delete answer/i });
      await fireEvent.click(deleteBtns[0]);
      expect(answerInputs().length).toBe(1);
    });
  });

  describe('view mode', () => {
    it('hides Add button when mode=view and showAnswers=false', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        mode: 'view',
        showAnswers: false,
      });
      expect(
        screen.queryByRole('button', { name: tr.$tr('addAnswerBtn') }),
      ).not.toBeInTheDocument();
    });

    it('shows answer inputs when mode=view and showAnswers=true', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        mode: 'view',
        showAnswers: true,
      });
      expect(answerInputs().length).toBeGreaterThanOrEqual(1);
    });

    it('hides the Add button in view mode even when showAnswers=true', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        mode: 'view',
        showAnswers: true,
      });
      expect(
        screen.queryByRole('button', { name: tr.$tr('addAnswerBtn') }),
      ).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('does not show errors before any field is touched', () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows an error after typing a non-numeric value and blurring', async () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
      });
      const input = answerInputs()[0];
      await fireEvent.input(input, { target: { value: 'not-a-number' } });
      await fireEvent.blur(input);
      await nextTick();

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('gives example numbers in the exercise language', async () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        language: 'fr',
      });
      await fireEvent.input(answerInputs()[0], { target: { value: 'abc' } });

      expect(screen.getByRole('alert')).toHaveTextContent('0,5');
    });

    it('rejects a stored answer that is not xsd:double until it is edited', async () => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', '1,5')),
        questionType: QuestionType.NUMERIC,
        language: 'fr',
      });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await fireEvent.input(answerInputs()[0], { target: { value: '1,5' } });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows validation errors as soon as the state changes', async () => {
      renderEditor({
        interaction: block(TEXT_ENTRY_BODY_XML),
        questionType: QuestionType.NUMERIC,
      });
      await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addAnswerBtn') }));
      await nextTick();

      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });
  });
});

describe('TextEntryEditor — textEntry', () => {
  it('renders the answer list section', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, STRING_DECL),
      questionType: QuestionType.TEXT_ENTRY,
    });
    const inputs = screen.queryAllByRole('textbox', { name: tr.$tr('answerTextPlaceholder') });
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a case-sensitive checkbox for each answer', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, STRING_DECL),
      questionType: QuestionType.TEXT_ENTRY,
    });
    expect(
      screen.getByRole('checkbox', { name: tr.$tr('caseSensitiveLabel') }),
    ).toBeInTheDocument();
  });

  it('does not render case-sensitive checkboxes for numeric', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
    });
    expect(
      screen.queryByRole('checkbox', { name: tr.$tr('caseSensitiveLabel') }),
    ).not.toBeInTheDocument();
  });
});

describe('TextEntryEditor — freeResponse', () => {
  it('does not render the Add answer button', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, FREE_DECL),
      questionType: QuestionType.FREE_RESPONSE,
    });
    expect(screen.queryByRole('button', { name: tr.$tr('addAnswerBtn') })).not.toBeInTheDocument();
  });

  it('does not render any answer input rows', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, FREE_DECL),
      questionType: QuestionType.FREE_RESPONSE,
    });
    expect(
      screen.queryAllByRole('textbox', { name: tr.$tr('answerValuePlaceholder') }).length,
    ).toBe(0);
    expect(screen.queryAllByRole('textbox', { name: tr.$tr('answerTextPlaceholder') }).length).toBe(
      0,
    );
  });
});

describe('TextEntryEditor — emits', () => {
  it('emits update:interaction on mount with bodyXml and responseDeclarations', () => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
    });
    expect(emitted()['update:interaction']).toBeTruthy();
    const payload = emitted()['update:interaction'][0][0];
    expect(typeof payload.bodyXml).toBe('string');
    expect(Array.isArray(payload.responseDeclarations)).toBe(true);
  });

  it('stores a numeric answer typed in the exercise language as xsd:double', async () => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
      language: 'fr',
    });
    const input = screen.getByRole('textbox', { name: tr.$tr('answerValuePlaceholder') });
    await fireEvent.input(input, { target: { value: '1,5' } });

    const [latest] = emitted()['update:interaction'].at(-1);
    expect(latest.responseDeclarations[0]).toContain('<qti-value>1.5</qti-value>');
  });

  it.each([
    ['de', '1,2'],
    ['en', '1,234'],
    ['fr', '1.50'],
  ])('emits a stored numeric answer unchanged when opened in %s (%s)', (language, stored) => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
      questionType: QuestionType.NUMERIC,
      language,
    });

    const [latest] = emitted()['update:interaction'].at(-1);
    expect(latest.responseDeclarations[0]).toContain(`<qti-value>${stored}</qti-value>`);
  });

  it.each([
    ['fr', '1234.5', '1234.5'],
    ['ar-EG', '30', '30'],
    ['fr', '1.2.3', '1.2.3'],
  ])(
    'keeps stored numeric answers as stored when switched to text entry in %s (%s)',
    async (language, stored, expected) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language,
      });
      await updateProps({ questionType: QuestionType.TEXT_ENTRY });

      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${expected}</qti-value>`);
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
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language,
      });
      await updateProps({ questionType: QuestionType.TEXT_ENTRY });
      await updateProps({ questionType: QuestionType.NUMERIC });

      expect(screen.getByRole('textbox', { name: tr.$tr('answerValuePlaceholder') })).toHaveValue(
        shown,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${stored}</qti-value>`);
    },
  );

  it.each([
    ['fr', '1,5'],
    ['en', '1,234'],
    ['de', '1.500'],
    ['', ' 5 '],
  ])(
    'keeps a typed numeric answer as typed when switched to text entry in "%s" (%s)',
    async (language, typed) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        language,
      });
      const input = screen.getByRole('textbox', { name: tr.$tr('answerValuePlaceholder') });
      await fireEvent.input(input, { target: { value: typed } });
      await updateProps({ questionType: QuestionType.TEXT_ENTRY });

      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${typed}</qti-value>`);
    },
  );

  it('emits update:interaction after adding an answer row', async () => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
    });
    const before = emitted()['update:interaction'].length;
    await fireEvent.click(screen.getByRole('button', { name: tr.$tr('addAnswerBtn') }));
    expect(emitted()['update:interaction'].length).toBeGreaterThan(before);
  });
});

describe('TextEntryEditor — accessibility', () => {
  it('delete icon buttons have accessible labels', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
    });
    screen
      .getAllByRole('button', { name: /Delete answer/i })
      .forEach(b => expect(b).toHaveAccessibleName());
  });
});

describe('TextEntryEditor — graceful fallback', () => {
  it('does not crash with empty bodyXml for numeric', () => {
    renderEditor({ interaction: block(''), questionType: QuestionType.NUMERIC });

    // An empty interaction is incomplete, and validation is not debounced, so it says so
    // right away rather than rendering nothing.
    expect(screen.getByText(tr.errorPromptRequired$())).toBeInTheDocument();
  });

  it('does not crash with empty bodyXml for freeResponse', () => {
    renderEditor({ interaction: block(''), questionType: QuestionType.FREE_RESPONSE });
    expect(screen.queryByRole('button', { name: tr.$tr('addAnswerBtn') })).not.toBeInTheDocument();
  });
});
