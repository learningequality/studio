/* eslint-env jest */
import { computed, ref } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { findChildren } from '@tiptap/core';
import { GapNode, findGap as findGapIn, isGap } from '../GapNode';
import { providePassageGaps } from '../passageGaps';
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

/** Sends the input event a browser sends before it changes the passage. */
export const input = (editor, inputType, data = null) =>
  editor.view.dom.dispatchEvent(
    new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }),
  );

/** Mounts the real TipTapEditor holding gaps; resolves its editor once it is ready. */
export async function renderPassage({
  value,
  mode = 'edit',
  errorGapIds = [],
  showAnswers = false,
}) {
  const gapIds = ref([]);
  const onReady = jest.fn();
  render(
    {
      components: { TipTapEditor },
      setup() {
        providePassageGaps({
          gapIds,
          isEditable: computed(() => mode === 'edit'),
          errorGapIds: computed(() => errorGapIds),
          showAnswers: computed(() => showAnswers),
        });
        return { extensions: [GapNode], mode };
      },
      data: () => ({ value }),
      methods: { onReady },
      template: `<TipTapEditor
        :value="value"
        :mode="mode"
        format="html"
        :extensions="extensions"
        @ready="onReady"
      />`,
    },
    { router: new VueRouter() },
  );
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  const editor = onReady.mock.calls[0][0];
  const syncGapIds = () => {
    gapIds.value = gapIdentifiers(editor);
  };
  syncGapIds();
  editor.on('transaction', syncGapIds);
  return { editor };
}
