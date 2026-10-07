/* eslint-env jest */
import { ref } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { findChip as findChipIn } from '../InlineChoiceNode';
import { injectPassageChips } from '../passageChips';
import { useInlineChoicePassage } from '../useInlineChoicePassage';
import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

/** Query options matching a chip's accessible name in any state. */
export const CHIP = {
  name: /, answer dropdown, /,
};

/** Dropdown HTML; `options` are `[id, text]` pairs. */
export const chip = (id, options, correct) =>
  `<qti-inline-choice-interaction response-identifier="${id}"${
    correct ? ` data-studio-correct="${correct}"` : ''
  }>${options
    .map(
      ([optionId, text]) =>
        `<qti-inline-choice identifier="${optionId}">${text}</qti-inline-choice>`,
    )
    .join('')}</qti-inline-choice-interaction>`;

/** `{ node, pos }` of the chip with that response identifier, or `null`. */
export const findChip = (editor, responseIdentifier) =>
  findChipIn(editor.state.doc, responseIdentifier) || null;

/** Mounts the real TipTapEditor through `useInlineChoicePassage`; resolves once it is ready. */
export async function renderPassage({ value, errorResponseIdentifiers, mode = 'edit' }) {
  let passage;
  let provided;
  const modeRef = ref(mode);
  // Reads what the passage provides, as the options panel (#6182) does.
  const Panel = {
    setup() {
      provided = injectPassageChips();
    },
    render: h => h(),
  };
  const onReady = jest.fn();
  const onMinimize = jest.fn();
  render(
    {
      components: { TipTapEditor, Panel },
      setup() {
        passage = useInlineChoicePassage({ errorResponseIdentifiers });
        return {
          extensions: passage.extensions,
          insertActions: passage.insertActions,
          mode: modeRef,
        };
      },
      data: () => ({ value }),
      methods: { onReady, onMinimize },
      template: `<div><TipTapEditor
        :value="value"
        :mode="mode"
        format="html"
        :extensions="extensions"
        :insertActions="insertActions"
        @ready="onReady"
        @minimize="onMinimize"
      /><Panel /></div>`,
    },
    { router: new VueRouter() },
  );
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  return {
    editor: onReady.mock.calls[0][0],
    openResponseIdentifier: passage.openResponseIdentifier,
    focusChip: provided.focusChip,
    onMinimize,
    setMode: newMode => {
      modeRef.value = newMode;
    },
  };
}
