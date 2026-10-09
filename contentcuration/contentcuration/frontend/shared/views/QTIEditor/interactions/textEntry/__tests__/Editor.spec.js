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

const answerInputs = () =>
  screen.queryAllByRole('textbox', { name: tr.$tr('answerValuePlaceholder') });

describe('TextEntryEditor — numeric', () => {
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

      expect(screen.getByRole('alert')).toHaveTextContent(
        tr.errorInvalidNumericValue$({ integer: '12', decimal: '0,5', negative: '-3,14' }),
      );
    });

    it.each([
      ['fr', '1234.5', '1234,5'],
      ['en', '1234.5', '1234.5'],
      ['en', '1.50', '1.50'],
      ['fr', '1.50', '1,50'],
      ['de', '1.234', '1,234'],
      ['ar-EG', '30', '٣٠'],
      ['en', '6.022e23', '6.022e23'],
      ['ar-EG', '3e8', '3e8'],
    ])('shows a stored answer in %s (%s) as %s', (language, stored, shown) => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language,
      });
      expect(answerInputs()[0]).toHaveValue(shown);
    });

    it.each([
      ['de', '123.456,78', '123456,78'],
      ['en', '1,234.5', '1234.5'],
      ['fr', ' 1 234,5 ', '1234,5'],
      ['ar-EG', '٣٠٫٥', '٣٠٫٥'],
      ['fr', 'abc', 'abc'],
    ])('shows an answer typed in %s as %s as %s on leaving it', async (language, typed, shown) => {
      renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        language,
      });
      const input = answerInputs()[0];
      await fireEvent.input(input, { target: { value: typed } });
      await fireEvent.blur(input);

      expect(input).toHaveValue(shown);
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
    const [input] = answerInputs();
    await fireEvent.input(input, { target: { value: '1,5' } });

    const [latest] = emitted()['update:interaction'].at(-1);
    expect(latest.responseDeclarations[0]).toContain('<qti-value>1.5</qti-value>');
  });

  it.each([
    ['de', '1.5'],
    ['de', '1.234'],
    ['fr', '1234.5'],
    ['hi', '1e+21'],
    ['ar-EG', '-0.5'],
  ])('emits a stored numeric answer unchanged when opened in %s (%s)', (language, stored) => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
      questionType: QuestionType.NUMERIC,
      language,
    });

    const [latest] = emitted()['update:interaction'].at(-1);
    expect(latest.responseDeclarations[0]).toContain(`<qti-value>${stored}</qti-value>`);
  });

  it.each(
    ['en', 'fr', 'de', 'ar-EG'].flatMap(language =>
      ['1.50', '+5', '5.', '1E3', '0012', '-0', '1e21', '12345678901234567890'].map(stored => [
        language,
        stored,
      ]),
    ),
  )('keeps a stored xsd:double in its form when opened in %s (%s)', async (language, stored) => {
    const { emitted, updateProps } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
      questionType: QuestionType.NUMERIC,
      language,
    });
    await updateProps({ mode: 'view' });
    await updateProps({ mode: 'edit' });

    for (const [payload] of emitted()['update:interaction']) {
      expect(payload.responseDeclarations[0]).toContain(`<qti-value>${stored}</qti-value>`);
    }
  });

  it.each([
    ['en', '-0', '-0'],
    ['fr', '0.0000001', '0,0000001'],
    ['ar-EG', '-0.000000123', '-٠٫٠٠٠٠٠٠١٢٣'],
  ])('shows a stored answer in %s (%s) the same after opening', async (language, stored, shown) => {
    const { updateProps } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
      questionType: QuestionType.NUMERIC,
      language,
      mode: 'view',
      showAnswers: true,
    });
    expect(answerInputs()[0]).toHaveValue(shown);
    await updateProps({ mode: 'edit' });

    expect(answerInputs()[0]).toHaveValue(shown);
  });

  it('shows a typed answer without an exponent on leaving it', async () => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
      questionType: QuestionType.NUMERIC,
      language: 'fr',
    });
    const [input] = answerInputs();
    await fireEvent.input(input, { target: { value: '0,0000001' } });
    await fireEvent.blur(input);

    expect(input).toHaveValue('0,0000001');
    const [latest] = emitted()['update:interaction'].at(-1);
    expect(latest.responseDeclarations[0]).toContain('<qti-value>0.0000001</qti-value>');
  });

  it.each([
    ['fr', '1.50', '1,50'],
    ['fr', '.5', ',5'],
    ['de', '0.50', '0,50'],
    ['sv', '2.000', '2,000'],
  ])(
    'shows and stores an answer typed in %s as %s the same on each leaving',
    async (language, typed, shown) => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        language,
      });
      const [input] = answerInputs();
      await fireEvent.input(input, { target: { value: typed } });
      await fireEvent.blur(input);
      const emittedBeforeRefocus = emitted()['update:interaction'].length;
      await fireEvent.focus(input);
      await fireEvent.blur(input);

      expect(input).toHaveValue(shown);
      expect(emitted()['update:interaction']).toHaveLength(emittedBeforeRefocus);
      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${typed}</qti-value>`);
    },
  );

  it.each([
    ['fr', '1,5', '1.5'],
    ['en', '1,234', '1234'],
    ['de', '1.234,5', '1234.5'],
  ])(
    'rewrites a stored answer in %s that is not xsd:double (%s) as the number it reads as',
    (language, stored, expected) => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language,
      });

      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${expected}</qti-value>`);
    },
  );

  it.each([
    ['fr', '1234.5', '1234,5'],
    ['en', '1.50', '1.50'],
    ['en', '0012', '0012'],
    ['ar-EG', '30', '٣٠'],
    ['fr', '1.2.3', '1.2.3'],
    ['he', '-0.5', '-0.5'],
    ['sv', '-0.5', '-0,5'],
    ['ar-EG', '-0.5', '-٠٫٥'],
  ])(
    'keeps a stored numeric answer as shown when switched to text entry in %s (%s)',
    async (language, stored, shown) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language,
      });
      await updateProps({ questionType: QuestionType.TEXT_ENTRY });

      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${shown}</qti-value>`);
    },
  );

  it.each([
    ['fr', '1,5', '1,5', '1.5'],
    ['fr', '1 234,5', '1234,5', '1234.5'],
  ])(
    'reads a text entry answer in %s (%s) when switched to numeric',
    async (language, text, shown, stored) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, STRING_DECL.replace('H2O', text)),
        questionType: QuestionType.TEXT_ENTRY,
        language,
      });
      await updateProps({ questionType: QuestionType.NUMERIC });

      expect(answerInputs()[0]).toHaveValue(shown);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${stored}</qti-value>`);
    },
  );

  it('leaves a text entry answer as stored in any language', () => {
    renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, STRING_DECL.replace('H2O', '1.5')),
      questionType: QuestionType.TEXT_ENTRY,
      language: 'fr',
    });
    expect(screen.getByRole('textbox', { name: tr.$tr('answerTextPlaceholder') })).toHaveValue(
      '1.5',
    );
  });

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

      expect(answerInputs()[0]).toHaveValue(shown);
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
    ['fa', 'می\u200cخواهم'],
    ['en', 'a­b'],
  ])(
    'keeps a typed numeric answer as typed when switched to text entry in "%s" (%s)',
    async (language, typed) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        language,
      });
      const [input] = answerInputs();
      await fireEvent.input(input, { target: { value: typed } });
      await updateProps({ questionType: QuestionType.TEXT_ENTRY });

      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${typed.trim()}</qti-value>`);
    },
  );

  it.each([
    ['', 'fr', '1,5', '1,5', '1.5'],
    ['fr', 'en', '1,234.5', '1234.5', '1234.5'],
    ['fr', 'de', '1.234,5', '1234,5', '1234.5'],
  ])(
    'reads an answer %s cannot read in %s after a language change (%s)',
    async (from, to, typed, shown, stored) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL),
        questionType: QuestionType.NUMERIC,
        language: from,
      });
      const [input] = answerInputs();
      await fireEvent.input(input, { target: { value: typed } });
      await fireEvent.blur(input);
      await updateProps({ language: to });

      expect(input).toHaveValue(shown);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(emitted()['update:errors'].at(-1)).toEqual([[]]);
      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${stored}</qti-value>`);
    },
  );

  it.each([
    ['fr', 'en', '1,234', '1.234', '1.234'],
    ['en', 'fr', '1,234', '1234', '1234'],
    ['de', 'fr', '1.234,5', '1234,5', '1234.5'],
  ])(
    'reads a stored answer in the old language after a language change (%s to %s, %s)',
    async (from, to, stored, shown, saved) => {
      const { emitted, updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language: from,
        mode: 'view',
        showAnswers: true,
      });
      await updateProps({ language: to });
      await updateProps({ mode: 'edit' });

      expect(answerInputs()[0]).toHaveValue(shown);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${saved}</qti-value>`);
    },
  );

  it.each([
    ['fr', '1E3', '1000'],
    ['en', '1E3', '1000'],
    ['', '0.50', '0.5'],
    ['', '0012', '12'],
  ])(
    'stores a retyped answer in %s (%s) as typed, not as stored (%s)',
    async (language, stored, typed) => {
      const { emitted } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', stored)),
        questionType: QuestionType.NUMERIC,
        language,
      });
      const [input] = answerInputs();
      await fireEvent.input(input, { target: { value: typed } });
      await fireEvent.blur(input);

      const [latest] = emitted()['update:interaction'].at(-1);
      expect(latest.responseDeclarations[0]).toContain(`<qti-value>${typed}</qti-value>`);
    },
  );

  it('does not emit on leaving an untouched stored answer that is not xsd:double', async () => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', '1,5')),
      questionType: QuestionType.NUMERIC,
      language: 'fr',
    });
    const before = emitted()['update:interaction'].length;
    const [input] = answerInputs();
    await fireEvent.focus(input);
    await fireEvent.blur(input);

    expect(emitted()['update:interaction']).toHaveLength(before);
  });

  it.each(['edit', 'view'])(
    'shows a stored answer that is not xsd:double as stored on opening (mounted in %s)',
    async mode => {
      const { updateProps } = renderEditor({
        interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, NUMERIC_DECL.replace('42', '1,234')),
        questionType: QuestionType.NUMERIC,
        language: 'en',
        mode,
        showAnswers: true,
      });
      await updateProps({ mode: 'edit' });

      expect(answerInputs()[0]).toHaveValue('1234');
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

  it('keeps typed whitespace in the input but emits the answer trimmed', async () => {
    const { emitted } = renderEditor({
      interaction: blockWithDecl(TEXT_ENTRY_BODY_XML, STRING_DECL),
      questionType: QuestionType.TEXT_ENTRY,
    });
    const [input] = screen.getAllByRole('textbox', { name: tr.$tr('answerTextPlaceholder') });
    await fireEvent.input(input, { target: { value: 'Paris ' } });
    await nextTick();

    expect(input).toHaveValue('Paris ');
    const updates = emitted()['update:interaction'];
    const [decl] = updates[updates.length - 1][0].responseDeclarations;
    expect(decl).toContain('<qti-value>Paris</qti-value>');
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
