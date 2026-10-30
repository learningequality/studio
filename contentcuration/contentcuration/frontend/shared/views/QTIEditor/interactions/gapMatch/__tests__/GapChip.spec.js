import { screen, waitFor } from '@testing-library/vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { findGap, gap, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));
jest.mock('mathlive', () => ({ convertLatexToSpeakableText: latex => `spoken ${latex}` }));

const { gapWithAnswer$, gapEmpty$, gapHidden$, chooseAnswer$, errorEmptyChoiceContent$ } =
  qtiEditorStrings;

const PASSAGE = `<p>Snow in ${gap('gap_a', 'winter', 'choice_a')} and ${gap('gap_b')}.</p>`;

describe('GapChip', () => {
  stubProseMirrorLayout();

  it('names each gap by its answer, or as empty, and by its position', async () => {
    await renderPassage({ value: PASSAGE });

    expect(
      await screen.findByRole('group', { name: gapWithAnswer$({ answer: 'winter', number: 1 }) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: gapEmpty$({ number: 2 }) })).toBeInTheDocument();
  });

  it('names a gap whose answer is a formula by the formula, as MathLive speaks it', async () => {
    await renderPassage({
      value: `<p>${gap('gap_m', '<span data-latex="x^2"></span>')}</p>`,
    });

    expect(
      await screen.findByRole('group', {
        name: gapWithAnswer$({ answer: 'spoken x^2', number: 1 }),
      }),
    ).toBeInTheDocument();
  });

  it('renames a gap as its answer is typed', async () => {
    const { editor } = await renderPassage({ value: PASSAGE });

    editor.commands.insertContentAt(findGap(editor, 'gap_b').pos + 1, 'sun');

    expect(
      await screen.findByRole('group', { name: gapWithAnswer$({ answer: 'sun', number: 2 }) }),
    ).toBeInTheDocument();
  });

  it('renumbers the gaps after one is inserted before them', async () => {
    const { editor } = await renderPassage({ value: PASSAGE });

    editor.chain().setTextSelection(1).insertGap().run();

    expect(
      await screen.findByRole('group', { name: gapWithAnswer$({ answer: 'winter', number: 2 }) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: gapEmpty$({ number: 1 }) })).toBeInTheDocument();
  });

  it('hides the answers in a preview that hides them', async () => {
    await renderPassage({ value: PASSAGE, mode: 'view', showAnswers: false });

    expect(
      await screen.findByRole('group', { name: gapHidden$({ number: 1 }) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: gapHidden$({ number: 2 }) })).toBeInTheDocument();
  });

  it('names the answers in a preview that shows them', async () => {
    await renderPassage({ value: PASSAGE, mode: 'view', showAnswers: true });

    expect(
      await screen.findByRole('group', { name: gapWithAnswer$({ answer: 'winter', number: 1 }) }),
    ).toBeInTheDocument();
  });

  it('says a blank gap has no answer where the passage cannot be edited', async () => {
    await renderPassage({ value: PASSAGE, mode: 'view', showAnswers: true });

    expect(await screen.findByRole('group', { name: gapEmpty$({ number: 2 }) })).toHaveTextContent(
      errorEmptyChoiceContent$(),
    );
  });

  it('leaves a blank gap empty while the passage is edited', async () => {
    await renderPassage({ value: PASSAGE });

    expect(
      await screen.findByRole('group', { name: gapEmpty$({ number: 2 }) }),
    ).not.toHaveTextContent(errorEmptyChoiceContent$());
  });

  it('shows a choice to make in a preview that hides the answers', async () => {
    await renderPassage({ value: PASSAGE, mode: 'view', showAnswers: false });

    expect(await screen.findByRole('group', { name: gapHidden$({ number: 1 }) })).toHaveTextContent(
      chooseAnswer$(),
    );
  });

  it('marks a gap the selection covers whole, but not one it covers part of', async () => {
    const { editor } = await renderPassage({ value: PASSAGE });
    const { pos, node } = findGap(editor, 'gap_a');
    const chip = await screen.findByRole('group', {
      name: gapWithAnswer$({ answer: 'winter', number: 1 }),
    });

    editor.commands.setTextSelection({ from: pos - 1, to: pos + node.nodeSize + 1 });
    await waitFor(() => expect(chip).toHaveClass('is-selected'));

    editor.commands.setTextSelection({ from: pos + 2, to: pos + 4 });
    await waitFor(() => expect(chip).not.toHaveClass('is-selected'));
  });
});
