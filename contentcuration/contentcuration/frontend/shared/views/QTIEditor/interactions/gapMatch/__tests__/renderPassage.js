/* eslint-env jest */
import { render, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { findChildren } from '@tiptap/core';
import { findGap as findGapIn, isGap } from '../GapNode';
import { useGapMatchPassage } from '../useGapMatchPassage';
import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

/** Gap HTML, as the passage stores it. */
export const gap = (identifier, answer = '', correct = null) =>
  `<qti-gap identifier="${identifier}"${
    correct ? ` data-studio-correct="${correct}"` : ''
  }>${answer}</qti-gap>`;

/** `{ node, pos }` of the gap with that identifier, or `null`. */
export const findGap = (editor, identifier) => findGapIn(editor.state.doc, identifier) || null;

/** The identifiers of the gaps in the passage, in document order. */
export const gapIdentifiers = editor =>
  findChildren(editor.state.doc, isGap).map(({ node }) => node.attrs.identifier);

/** Presses a key in the passage, as a keyboard does. */
export const press = (editor, key, init = {}) =>
  editor.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );

/**
 * Sends the input event a browser sends before it changes the passage. `range` is the part of
 * the passage the browser will delete; jsdom has no `getTargetRanges`.
 */
export function input(editor, inputType, data = null, range = null) {
  const event = new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true });
  if (range) {
    const start = editor.view.domAtPos(range.from);
    const end = editor.view.domAtPos(range.to);
    event.getTargetRanges = () => [
      {
        startContainer: start.node,
        startOffset: start.offset,
        endContainer: end.node,
        endOffset: end.offset,
      },
    ];
  }
  return editor.view.dom.dispatchEvent(event);
}

/** Mounts the real TipTapEditor through `useGapMatchPassage`; resolves once it is ready. */
export async function renderPassage({
  value,
  mode = 'edit',
  errorGapIds = [],
  showAnswers = false,
  onChange,
}) {
  const onReady = jest.fn();
  render(
    {
      components: { TipTapEditor },
      setup() {
        const passage = useGapMatchPassage({ errorGapIds, showAnswers, onChange });
        return { extensions: passage.extensions, insertActions: passage.insertActions, mode };
      },
      data: () => ({ value }),
      methods: { onReady },
      template: `<TipTapEditor
        :value="value"
        :mode="mode"
        format="html"
        :extensions="extensions"
        :insertActions="insertActions"
        @ready="onReady"
      />`,
    },
    { router: new VueRouter() },
  );
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  return { editor: onReady.mock.calls[0][0] };
}
