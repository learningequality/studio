import { nextTick } from 'vue';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { getDropdowns } from '../parse';
import { CHIP, chip, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const dropdowns = editor => getDropdowns(editor.getHTML());

const chipHTML = ({ responseIdentifier, options, correctId }) =>
  chip(
    responseIdentifier,
    options.map(option => [option.id, option.text]),
    correctId,
  );

// The handler only trusts the selection once the author has focused the editor.
async function renderAt(value, from, to = from) {
  const rendered = await renderPassage({ value });
  rendered.editor.view.dom.focus();
  rendered.editor.commands.setTextSelection({ from, to });
  await nextTick();
  return rendered;
}

const INSERT = { name: qtiEditorStrings.insertInlineChoice$() };

const clickInsert = () => userEvent.click(screen.getByRole('button', INSERT));

describe('useInlineChoicePassage Insert action', () => {
  stubProseMirrorLayout();

  it('inserts a blank chip at the cursor and selects it', async () => {
    const { editor, selectedResponseIdentifier } = await renderAt('<p>The rises</p>', 5);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options).toEqual([{ id: expect.any(String), text: '' }]);
    expect(dropdown.correctId).toBeNull();
    expect(editor.getHTML()).toBe(`<p>The ${chipHTML(dropdown)}rises</p>`);
    expect(selectedResponseIdentifier.value).toBe(dropdown.responseIdentifier);
    const el = await screen.findByRole('img', CHIP);
    expect(el).toHaveTextContent(`0 ${qtiEditorStrings.addAnswers$()}`);
    await waitFor(() => expect(el).toHaveAttribute('aria-current', 'true'));
  });

  it.each([
    ['a code block', '<p>a</p><pre><code>xyz</code></pre>'],
    ['an image', '<p>a</p><img src="x.png">'],
  ])(
    'puts the cursor after a chip inserted at the end of a passage ending in %s',
    async (_, value) => {
      const { editor } = await renderPassage({ value });
      await clickInsert();
      editor.commands.insertContent('Z');

      const [dropdown] = dropdowns(editor);
      expect(editor.getHTML()).toContain(`<p>${chipHTML(dropdown)}Z</p>`);
    },
  );

  it('clears the selected dropdown when its chip leaves the passage', async () => {
    const { editor, selectedResponseIdentifier } = await renderAt('<p>The rises</p>', 5);
    await clickInsert();
    expect(selectedResponseIdentifier.value).not.toBeNull();

    editor.commands.undo();
    expect(dropdowns(editor)).toEqual([]);
    expect(selectedResponseIdentifier.value).toBeNull();
  });

  it('inserts a chip when Insert is focused and Enter is pressed', async () => {
    const { editor } = await renderAt('<p>The rises</p>', 5);
    screen.getByRole('button', INSERT).focus();
    await userEvent.keyboard('{Enter}');

    expect(dropdowns(editor)).toHaveLength(1);
  });

  it('turns highlighted text into a chip whose correct option is that text', async () => {
    const { editor, selectedResponseIdentifier } = await renderAt('<p>The Moon rises</p>', 5, 9);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options).toEqual([{ id: expect.any(String), text: 'Moon' }]);
    expect(dropdown.correctId).toBe(dropdown.options[0].id);
    expect(editor.getHTML()).toBe(`<p>The ${chipHTML(dropdown)} rises</p>`);
    expect(selectedResponseIdentifier.value).toBe(dropdown.responseIdentifier);
    await waitFor(() =>
      expect(screen.getByRole('img', CHIP)).toHaveAttribute('aria-current', 'true'),
    );
  });

  it('drops the formatting of highlighted text', async () => {
    const { editor } = await renderAt('<p><strong>Mo</strong><em>on</em></p>', 1, 5);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options[0].text).toBe('Moon');
    expect(editor.getHTML()).toBe(`<p>${chipHTML(dropdown)}</p>`);
  });

  it('leaves whitespace around the highlighted text in the passage', async () => {
    const { editor } = await renderAt('<p>The Moon rises</p>', 4, 10);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options[0].text).toBe('Moon');
    expect(editor.getHTML()).toBe(`<p>The ${chipHTML(dropdown)} rises</p>`);
  });

  it('turns a one-paragraph passage selected with select-all into a chip', async () => {
    const { editor } = await renderAt('<p>The Moon</p>', 1);
    editor.commands.selectAll();
    await nextTick();
    expect(screen.getByRole('button', INSERT)).not.toHaveAttribute('aria-disabled', 'true');
    await clickInsert();

    const [dropdown] = dropdowns(editor);
    expect(dropdown.options).toEqual([{ id: expect.any(String), text: 'The Moon' }]);
    expect(editor.getHTML()).toBe(`<p>${chipHTML(dropdown)}</p>`);
  });

  it('is unavailable while the selection spans paragraphs', async () => {
    const { editor } = await renderAt('<p>one</p><p>two</p>', 2, 7);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(dropdowns(editor)).toEqual([]);
  });

  it('is unavailable where a chip cannot go', async () => {
    const { editor } = await renderAt('<pre><code>x</code></pre>', 1);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(dropdowns(editor)).toEqual([]);
  });

  it('is available before focus when the passage starts where a chip cannot go', async () => {
    const { editor } = await renderPassage({ value: '<pre><code>x</code></pre><p>a</p>' });
    expect(screen.getByRole('button', INSERT)).not.toHaveAttribute('aria-disabled', 'true');
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
  });

  it('adds a new chip after a selected chip instead of replacing it', async () => {
    const original = {
      responseIdentifier: 'r1',
      options: [{ id: 'a', text: 'x' }],
      correctId: 'a',
    };
    const { editor, selectedResponseIdentifier } = await renderAt(
      `<p>a${chipHTML(original)}b</p>`,
      1,
    );
    editor.commands.setNodeSelection(2);
    await nextTick();
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(2);
    const [first, second] = dropdowns(editor);
    expect(first).toEqual(original);
    expect(second.options).toEqual([{ id: expect.any(String), text: '' }]);
    expect(editor.getHTML()).toBe(`<p>a${chipHTML(original)}${chipHTML(second)}b</p>`);
    expect(selectedResponseIdentifier.value).toBe(second.responseIdentifier);
  });

  it('keeps a chip inside the highlighted text and adds the new one after it', async () => {
    const original = {
      responseIdentifier: 'r1',
      options: [{ id: 'a', text: 'x' }],
      correctId: 'a',
    };
    const { editor } = await renderAt(`<p>a ${chipHTML(original)} b</p>`, 1, 5);
    await clickInsert();

    const [first, second] = dropdowns(editor);
    expect(dropdowns(editor)).toHaveLength(2);
    expect(first).toEqual(original);
    expect(second.options).toEqual([{ id: expect.any(String), text: '' }]);
    expect(editor.getHTML()).toBe(`<p>a ${chipHTML(original)} ${chipHTML(second)}b</p>`);
  });
});
