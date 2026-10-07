import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { closeHistory } from '@tiptap/pm/history';
import { getDropdowns, parseInlineChoiceInteraction } from '../parse';
import { chip, findChip, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';
import { getTipTapEditorStrings } from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditorStrings';

const { copy$, paste$ } = getTipTapEditorStrings();

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

// jsdom has no ClipboardEvent, which `pasteHTML` creates by default.
const paste = (editor, html) => editor.view.pasteHTML(html, new Event('paste'));

describe('InlineChoiceNode', () => {
  stubProseMirrorLayout();

  it('returns passage HTML with chips unchanged, in a list item and a heading too', async () => {
    const bodyXml =
      '<qti-item-body><p>Sky is ' +
      chip(
        'response_a',
        [
          ['choice_a', 'blue'],
          ['choice_b', 'red'],
        ],
        'choice_a',
      ) +
      '</p><ul><li><p>' +
      chip('response_b', [['choice_c', '']]) +
      '</p></li></ul><h2>' +
      chip('response_c', [['choice_d', 'x']], 'choice_d') +
      '</h2></qti-item-body>';
    const { passage } = parseInlineChoiceInteraction(bodyXml, []);
    const { editor } = await renderPassage({ value: passage });
    expect(editor.getHTML()).toBe(passage);
  });

  it('holds the dropdowns getDropdowns reads, including a blank and an unmarked chip', async () => {
    const value = `<p>${chip(
      'r1',
      [
        ['c1', 'a'],
        ['c2', ''],
      ],
      'c1',
    )} ${chip('r2', [['c3', '']])}</p>`;
    const { editor } = await renderPassage({ value });
    const attrs = ['r1', 'r2'].map(id => findChip(editor, id).node.attrs);
    expect(getDropdowns(editor.getHTML())).toEqual(attrs);
    expect(attrs[1]).toEqual({
      responseIdentifier: 'r2',
      options: [{ id: 'c3', text: '' }],
      correctId: null,
    });
  });

  it('restores a deleted chip with its options and correct answer on undo', async () => {
    const value = `<p>a${chip(
      'r1',
      [
        ['c1', 'x'],
        ['c2', 'y'],
      ],
      'c2',
    )}b</p>`;
    const { editor } = await renderPassage({ value });
    const { node, pos } = findChip(editor, 'r1');
    editor.commands.setNodeSelection(pos);
    editor.commands.deleteSelection();
    expect(findChip(editor, 'r1')).toBeNull();

    editor.commands.undo();
    expect(findChip(editor, 'r1').node.attrs).toEqual(node.attrs);
  });

  describe('updateInlineChoice', () => {
    const value = `<p>${chip(
      'r1',
      [
        ['c1', 'x'],
        ['c2', 'y'],
      ],
      'c1',
    )}</p>`;

    it('is one undo step and one redo step', async () => {
      const { editor } = await renderPassage({ value });
      const before = editor.getHTML();
      editor.commands.updateInlineChoice('r1', {
        options: [
          { id: 'c1', text: 'x2' },
          { id: 'c2', text: 'y' },
        ],
        correctId: 'c2',
      });
      const after = editor.getHTML();
      expect(after).not.toBe(before);

      editor.commands.undo();
      expect(editor.getHTML()).toBe(before);
      editor.commands.redo();
      expect(editor.getHTML()).toBe(after);
    });

    it('groups updates in quick succession into one undo step, as typing does', async () => {
      const { editor } = await renderPassage({ value });
      const before = editor.getHTML();
      for (const text of ['M', 'Mo', 'Moo', 'Moon']) {
        editor.commands.updateInlineChoice('r1', {
          options: [
            { id: 'c1', text },
            { id: 'c2', text: 'y' },
          ],
        });
      }
      editor.commands.undo();
      expect(editor.getHTML()).toBe(before);
    });

    it('clears a correctId whose option was removed', async () => {
      const { editor } = await renderPassage({ value });
      editor.commands.updateInlineChoice('r1', { options: [{ id: 'c2', text: 'y' }] });
      expect(findChip(editor, 'r1').node.attrs.correctId).toBeNull();
    });

    it('gives an added option with no id a fresh one, keeping the other ids', async () => {
      const { editor } = await renderPassage({ value });
      editor.commands.updateInlineChoice('r1', {
        options: [
          { id: 'c1', text: 'x' },
          { id: '', text: 'z' },
        ],
      });
      const { attrs } = findChip(editor, 'r1').node;
      expect(attrs.responseIdentifier).toBe('r1');
      expect(attrs.options).toEqual([
        { id: 'c1', text: 'x' },
        { id: expect.stringMatching(/./), text: 'z' },
      ]);
      expect(getDropdowns(editor.getHTML())[0].options[1].id).toBe(attrs.options[1].id);
    });

    it('refuses to leave a chip with no options', async () => {
      const { editor } = await renderPassage({ value });
      const before = findChip(editor, 'r1').node.attrs;
      expect(editor.commands.updateInlineChoice('r1', { options: [] })).toBe(false);
      expect(findChip(editor, 'r1').node.attrs).toEqual(before);
    });

    it('keeps the chip ids when a choice id is also used by another chip', async () => {
      const { editor } = await renderPassage({
        value: `<p>${chip('r0', [['c9', '']])} ${chip('r1', [['c1', 'x']])}</p>`,
      });
      const options = [
        { id: 'c1', text: 'x' },
        { id: 'c9', text: '' },
      ];
      editor.commands.updateInlineChoice('r1', { options });
      expect(findChip(editor, 'r1').node.attrs.options).toEqual(options);
    });

    const deleteAndUndo = editor => {
      const { attrs } = findChip(editor, 'r1').node;
      editor.view.dispatch(closeHistory(editor.state.tr));
      editor.commands.setNodeSelection(findChip(editor, 'r1').pos);
      editor.commands.deleteSelection();
      editor.view.dispatch(closeHistory(editor.state.tr));
      editor.commands.undo();
      expect(findChip(editor, 'r1').node.attrs).toEqual(attrs);
    };

    it('lets undo restore a deleted chip holding an option with no id', async () => {
      const { editor } = await renderPassage({
        value: `<p>a${chip('r1', [
          ['c1', 'x'],
          ['', ''],
        ])}b</p>`,
      });
      deleteAndUndo(editor);
    });

    it('lets undo restore a deleted chip sharing a choice id with another chip', async () => {
      const { editor } = await renderPassage({
        value: `<p>a${chip('r1', [['c1', 'x']])}b${chip('r2', [['c2', 'y']])}</p>`,
      });
      editor.commands.updateInlineChoice('r2', { options: [{ id: 'c1', text: 'y' }] });
      deleteAndUndo(editor);
    });
  });

  describe('paste', () => {
    const source = chip(
      'r1',
      [
        ['c1', 'x'],
        ['c2', 'y'],
      ],
      'c2',
    );

    // A copy of `source` with none of its ids, and the same option correct.
    const expectFreshCopy = copy => {
      expect(copy.responseIdentifier).not.toBe('r1');
      expect(copy.options.map(o => o.id)).not.toContain('c1');
      expect(copy.options.map(o => o.id)).not.toContain('c2');
      expect(copy.correctId).toBe(copy.options[1].id);
    };

    it('gives a copy fresh ids and keeps the same option correct', async () => {
      const { editor } = await renderPassage({ value: `<p>${source}</p>` });
      paste(editor, source);

      const dropdowns = getDropdowns(editor.getHTML());
      expect(dropdowns).toHaveLength(2);
      const [original, copy] = dropdowns;
      expect(copy.responseIdentifier).not.toBe(original.responseIdentifier);
      expect(copy.options.map(o => o.text)).toEqual(['x', 'y']);
      copy.options.forEach((o, i) => expect(o.id).not.toBe(original.options[i].id));
      expect(copy.correctId).toBe(copy.options[1].id);
    });

    it('renames only the choice id that collides', async () => {
      const { editor } = await renderPassage({ value: `<p>${source}</p>` });
      paste(editor, chip('other', [['c1', 'z']], 'c1'));
      const dropdowns = getDropdowns(editor.getHTML());
      expect(dropdowns).toHaveLength(2);
      const copy = dropdowns.find(d => d.options[0].text === 'z');
      expect(copy.responseIdentifier).toBe('other');
      expect(copy.options[0].id).not.toBe('c1');
      expect(copy.correctId).toBe(copy.options[0].id);
    });

    it('re-identifies a chip whose own choices share an id', async () => {
      const { editor } = await renderPassage({ value: '<p>a</p>' });
      paste(
        editor,
        chip(
          'rX',
          [
            ['c1', 'p'],
            ['c1', 'q'],
          ],
          'c1',
        ),
      );
      const [{ options, correctId }] = getDropdowns(editor.getHTML());
      expect(options[0].id).not.toBe(options[1].id);
      expect(correctId).toBe(options[0].id);
    });

    it('gives a pasted chip missing its ids fresh ones', async () => {
      const { editor } = await renderPassage({ value: '<p>a</p>' });
      paste(
        editor,
        '<qti-inline-choice-interaction><qti-inline-choice>t</qti-inline-choice></qti-inline-choice-interaction>',
      );
      const [pasted] = getDropdowns(editor.getHTML());
      expect(pasted.responseIdentifier).not.toBe('');
      expect(pasted.options).toEqual([{ id: expect.stringMatching(/./), text: 't' }]);
    });

    it('keeps ids when the source was removed first (cut and paste)', async () => {
      const { editor } = await renderPassage({ value: `<p>${source}</p>` });
      editor.commands.setNodeSelection(findChip(editor, 'r1').pos);
      editor.commands.deleteSelection();
      paste(editor, source);
      expect(getDropdowns(editor.getHTML())).toEqual([
        {
          responseIdentifier: 'r1',
          options: [
            { id: 'c1', text: 'x' },
            { id: 'c2', text: 'y' },
          ],
          correctId: 'c2',
        },
      ]);
    });

    it('keeps ids on cut and paste of a chip holding an option with no id', async () => {
      const { editor } = await renderPassage({
        value: `<p>${chip('r1', [
          ['c1', 'x'],
          ['', ''],
        ])}</p>`,
      });
      const cut = editor.getHTML();
      editor.commands.setNodeSelection(findChip(editor, 'r1').pos);
      editor.commands.deleteSelection();
      paste(editor, cut);
      const [{ responseIdentifier, options }] = getDropdowns(editor.getHTML());
      expect(responseIdentifier).toBe('r1');
      expect(options).toEqual([
        { id: 'c1', text: 'x' },
        { id: expect.stringMatching(/./), text: '' },
      ]);
    });

    describe('with the toolbar Copy and Paste buttons', () => {
      let clipboard;

      // jsdom has none; ProseMirror's `pasteHTML` constructs one.
      beforeAll(() => {
        global.ClipboardEvent = class ClipboardEvent extends Event {};
      });

      afterAll(() => {
        delete global.ClipboardEvent;
      });

      beforeEach(() => {
        clipboard = [];
        global.ClipboardItem = class {
          constructor(data) {
            this.types = Object.keys(data);
            // jsdom's Blob has no `text()`.
            this.getType = type =>
              Promise.resolve({
                text: () =>
                  new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsText(data[type]);
                  }),
              });
          }
        };
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            write: items => Promise.resolve((clipboard = items)),
            read: () => Promise.resolve(clipboard),
          },
        });
      });

      afterEach(() => {
        delete global.ClipboardItem;
        delete navigator.clipboard;
      });

      const clickPaste = async (editor, html) => {
        if (html) {
          clipboard = [new ClipboardItem({ 'text/html': new Blob([html]) })];
        }
        editor.commands.focus('end');
        await userEvent.click(screen.getByRole('button', { name: paste$() }));
      };

      it('gives a pasted copy fresh ids', async () => {
        const { editor } = await renderPassage({ value: `<p>a${source}b</p>` });
        await clickPaste(editor, source);
        await waitFor(() => expect(getDropdowns(editor.getHTML())).toHaveLength(2));
        const [original, copy] = getDropdowns(editor.getHTML());
        expect(original.responseIdentifier).toBe('r1');
        expectFreshCopy(copy);
      });

      it('copies a selected chip as a dropdown that pastes as a new chip', async () => {
        const { editor } = await renderPassage({ value: `<p>a${source}b</p>` });
        editor.commands.focus();
        editor.commands.setNodeSelection(findChip(editor, 'r1').pos);
        await userEvent.click(screen.getByRole('button', { name: copy$() }));
        await waitFor(() => expect(clipboard).toHaveLength(1));

        await clickPaste(editor);
        await waitFor(() => expect(getDropdowns(editor.getHTML())).toHaveLength(2));
        const [, copy] = getDropdowns(editor.getHTML());
        expect(copy.options.map(o => o.text)).toEqual(['x', 'y']);
        expectFreshCopy(copy);
      });
    });

    describe('inserted by a transaction', () => {
      it('gives a copy of a chip still in the passage fresh ids', async () => {
        const { editor } = await renderPassage({ value: `<p>a${source}b</p>` });
        const { node } = findChip(editor, 'r1');
        editor.view.dispatch(editor.state.tr.insert(1, node.type.create(node.attrs)));

        const [copy, original] = getDropdowns(editor.getHTML());
        expect(original).toEqual(node.attrs);
        expectFreshCopy(copy);
        expect(copy.options.map(o => o.text)).toEqual(['x', 'y']);
      });

      // An option with no id would make a newly arrived chip take fresh ids.
      it('keeps the ids of a chip deleted and reinserted elsewhere', async () => {
        const moved = chip(
          'r1',
          [
            ['c1', 'x'],
            ['', 'y'],
          ],
          'c1',
        );
        const { editor } = await renderPassage({ value: `<p>a${moved}b</p><p>z</p>` });
        const { node, pos } = findChip(editor, 'r1');
        const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
        tr.insert(tr.doc.content.size - 1, node);
        editor.view.dispatch(tr);

        expect(editor.getHTML()).toBe(`<p>ab</p><p>z${moved}</p>`);
      });
    });

    // ProseMirror reads the copy modifier (Ctrl off macOS) again at drop, so it may differ from
    // dragstart.
    const drag = async ({ copyAtStart, copyAtDrop }) => {
      const { editor } = await renderPassage({ value: `<p>a${source}b</p><p>z</p>` });
      const { view } = editor;
      editor.commands.setNodeSelection(findChip(editor, 'r1').pos);
      const data = {};
      const dataTransfer = {
        files: [],
        clearData: () => {},
        setData: (type, value) => (data[type] = value),
        getData: type => data[type] || '',
      };
      const fire = (type, ctrlKey) => {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, ctrlKey });
        Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
        view.dom.dispatchEvent(event);
      };
      // jsdom has no layout; drop at the end of the second paragraph.
      const dropPos = editor.state.doc.content.size - 1;
      view.posAtCoords = () => ({ pos: dropPos, inside: -1 });
      fire('dragstart', copyAtStart);
      fire('drop', copyAtDrop);
      return getDropdowns(editor.getHTML());
    };

    it.each([
      ['no modifier', false, false],
      ['the modifier released before drop', true, false],
    ])('keeps ids when a chip is drag-moved with %s', async (_, copyAtStart, copyAtDrop) => {
      const dropdowns = await drag({ copyAtStart, copyAtDrop });
      expect(dropdowns).toHaveLength(1);
      expect(dropdowns[0].responseIdentifier).toBe('r1');
      expect(dropdowns[0].options.map(o => o.id)).toEqual(['c1', 'c2']);
    });

    it.each([
      ['the modifier', true, true],
      ['the modifier pressed only at drop', false, true],
    ])('gives fresh ids when a chip is drag-copied with %s', async (_, copyAtStart, copyAtDrop) => {
      const [original, copy] = await drag({ copyAtStart, copyAtDrop });
      expect(original.responseIdentifier).toBe('r1');
      expectFreshCopy(copy);
    });
  });
});
