import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import GapMatchEditor from '../Editor.vue';
import { gapMatchInteractionDescriptor as descriptor } from '../Descriptor';
import { getGaps } from '../parse';
import { QuestionType, ValidationError } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';
import { gap } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});
jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: () => ({ sendPoliteMessage: jest.fn(), sendAssertiveMessage: jest.fn() }),
}));

const PASSAGE = `<p>Snow falls in ${gap('gap_a', 'winter')} and the sun is hottest in ${gap(
  'gap_b',
  '<strong>summer</strong>',
)}.</p>`;

const DISTRACTORS = [{ id: 'choice_spring', content: 'spring' }];

const interactionOf = state =>
  descriptor.buildXML(
    { prompt: '<p>Fill in the seasons</p>', passage: PASSAGE, distractors: DISTRACTORS, ...state },
    QuestionType.GAP_MATCH,
  );

const GAP = { name: /gap \d/i };

async function renderEditor(props = {}) {
  const user = userEvent.setup();
  const rendered = render(GapMatchEditor, {
    props: {
      interaction: interactionOf(),
      questionType: QuestionType.GAP_MATCH,
      mode: 'edit',
      ...props,
    },
    routes: new VueRouter(),
  });
  if (props.mode !== 'view') {
    await user.click(await screen.findByRole('button', { name: tr.editPassageLabel$() }));
  }
  return { ...rendered, user };
}

/** The part of the editor under the heading with that name: its field, help and errors. */
const section = name => screen.getByRole('heading', { name }).parentElement;

/** The state of the last interaction the editor emitted, as saved and read back. */
function saved(emitted) {
  const [interaction] = emitted['update:interaction'].at(-1);
  return descriptor.parse(interaction.bodyXml, interaction.responseDeclarations);
}

const lastErrors = emitted => emitted['update:errors'].at(-1)[0];

describe('GapMatchEditor', () => {
  stubProseMirrorLayout();

  it('shows the optional question, the passage editor and the distractors with their help', async () => {
    await renderEditor();

    expect(screen.getByRole('heading', { name: tr.questionOptionalLabel$() })).toBeInTheDocument();
    expect(section(tr.passageEditorLabel$())).toHaveTextContent(tr.gapPassageEditorDescription$());
    expect(section(tr.distractorsLabel$())).toHaveTextContent(tr.distractorsDescription$());
  });

  it('shows each gap, named by its answer and position', async () => {
    await renderEditor();

    expect(
      await screen.findByRole('group', {
        name: tr.gapWithAnswer$({ answer: 'winter', number: 1 }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: tr.gapWithAnswer$({ answer: 'summer', number: 2 }) }),
    ).toBeInTheDocument();
  });

  it('adds a gap with Insert, which the saved item holds', async () => {
    const { user, emitted } = await renderEditor();
    await waitFor(() => expect(screen.getAllByRole('group', GAP)).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: tr.insertGap$() }));

    await waitFor(() => expect(getGaps(saved(emitted()).passage)).toHaveLength(3));
  });

  describe('distractors', () => {
    it('adds a distractor, which the saved item holds', async () => {
      const { user, emitted } = await renderEditor({
        interaction: interactionOf({ distractors: [] }),
      });

      await user.click(screen.getByRole('button', { name: tr.addDistractorBtn$() }));
      const draft = await within(section(tr.distractorsLabel$())).findByRole('textbox', {
        name: /text editor/,
      });
      // jsdom does not edit a contenteditable element as a browser does, so ProseMirror would
      // see no typing.
      draft.querySelector('.ProseMirror').editor.chain().focus().insertContent('autumn').run();
      await user.click(screen.getByRole('button', { name: tr.saveChipBtn$() }));

      await waitFor(() =>
        expect(saved(emitted()).distractors).toEqual([
          { id: expect.any(String), content: expect.stringContaining('autumn') },
        ]),
      );
    });

    it('removes a distractor, which the saved item no longer holds', async () => {
      const { user, emitted } = await renderEditor();

      await user.click(
        screen.getByRole('button', { name: tr.deleteDistractorBtn$({ number: 1 }) }),
      );

      await waitFor(() => expect(saved(emitted()).distractors).toEqual([]));
    });

    it('edits a distractor on a single line', async () => {
      const { user } = await renderEditor();

      await user.click(
        screen.getByRole('button', { name: tr.editDistractorLabel$({ number: 1 }) }),
      );

      const chipEditor = await within(section(tr.distractorsLabel$())).findByRole('textbox', {
        name: /text editor/,
      });
      expect(chipEditor).toHaveAttribute('aria-multiline', 'false');
    });
  });

  it('restores the question, every answer and the distractors when a saved item reopens', async () => {
    const { emitted, unmount } = await renderEditor();
    const [interaction] = emitted()['update:interaction'].at(-1);
    unmount();

    await renderEditor({ interaction });

    expect(
      await screen.findByRole('group', {
        name: tr.gapWithAnswer$({ answer: 'winter', number: 1 }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: tr.gapWithAnswer$({ answer: 'summer', number: 2 }) }),
    ).toBeInTheDocument();
    expect(section(tr.distractorsLabel$())).toHaveTextContent('spring');
    expect(section(tr.questionOptionalLabel$())).toHaveTextContent('Fill in the seasons');
  });

  describe('validation', () => {
    const distractorItems = () => within(section(tr.distractorsLabel$())).getAllByRole('listitem');

    it('shows a gap with no answer and marks the question incomplete', async () => {
      const { emitted } = await renderEditor({
        interaction: interactionOf({
          passage: `<p>Snow falls in ${gap('gap_a')}, sun in ${gap('gap_b', 'summer')}.</p>`,
        }),
      });

      expect(section(tr.passageEditorLabel$())).toHaveTextContent(tr.errorEmptyGap$());
      expect(await screen.findByRole('group', { name: tr.gapEmpty$({ number: 1 }) })).toHaveClass(
        'has-errors',
      );
      expect(
        screen.getByRole('group', { name: tr.gapWithAnswer$({ answer: 'summer', number: 2 }) }),
      ).not.toHaveClass('has-errors');
      expect(lastErrors(emitted())).toContainEqual({
        code: ValidationError.EMPTY_ANSWER_CONTENT,
        id: 'gap_a',
      });
    });

    it('shows a passage with no gap and marks the question incomplete', async () => {
      const { emitted } = await renderEditor({
        interaction: interactionOf({ passage: '<p>No gaps here</p>' }),
      });

      expect(section(tr.passageEditorLabel$())).toHaveTextContent(tr.errorNoGap$());
      expect(lastErrors(emitted())).toEqual([{ code: ValidationError.NO_CORRECT_ANSWER }]);
    });

    it('shows a blank distractor under it', async () => {
      const { emitted } = await renderEditor({
        interaction: interactionOf({
          distractors: [
            { id: 'choice_ok', content: 'spring' },
            { id: 'choice_x', content: '' },
          ],
        }),
      });

      const [valid, blank] = distractorItems();
      expect(blank).toHaveTextContent(tr.errorEmptyChoiceContent$());
      expect(valid).not.toHaveTextContent(tr.errorEmptyChoiceContent$());
      expect(lastErrors(emitted())).toContainEqual({
        code: ValidationError.EMPTY_CHOICE_CONTENT,
        id: 'choice_x',
      });
    });

    it('shows a distractor that repeats an answer under it', async () => {
      const { emitted } = await renderEditor({
        interaction: interactionOf({
          distractors: [
            { id: 'choice_ok', content: 'spring' },
            { id: 'choice_x', content: 'winter' },
          ],
        }),
      });

      const [valid, repeated] = distractorItems();
      expect(repeated).toHaveTextContent(tr.errorDuplicateDistractorContent$());
      expect(valid).not.toHaveTextContent(tr.errorDuplicateDistractorContent$());
      expect(lastErrors(emitted())).toContainEqual(
        expect.objectContaining({ code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT }),
      );
    });
  });

  describe('view mode', () => {
    it('shows the question and the passage under Answers, without the distractors', async () => {
      await renderEditor({ mode: 'view', showAnswers: true });

      expect(screen.getByRole('heading', { name: tr.questionLabel$() })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: tr.gapMatchAnswersLabel$() })).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: tr.distractorsLabel$() }),
      ).not.toBeInTheDocument();
    });

    it('shows the answers when answers are shown', async () => {
      await renderEditor({ mode: 'view', showAnswers: true });

      expect(
        await screen.findByRole('group', {
          name: tr.gapWithAnswer$({ answer: 'winter', number: 1 }),
        }),
      ).toBeInTheDocument();
    });

    it('keeps the gaps when an item with no question closes', async () => {
      const { updateProps } = await renderEditor({
        interaction: interactionOf({ prompt: '' }),
        showAnswers: true,
      });

      await updateProps({ mode: 'view' });

      expect(
        await screen.findByRole('group', {
          name: tr.gapWithAnswer$({ answer: 'winter', number: 1 }),
        }),
      ).toBeInTheDocument();
    });

    it('hides the answers when answers are hidden', async () => {
      await renderEditor({ mode: 'view', showAnswers: false });

      expect(
        await screen.findByRole('group', { name: tr.gapHidden$({ number: 1 }) }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: /winter/ })).not.toBeInTheDocument();
    });
  });
});
