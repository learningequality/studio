/* eslint-env jest */
import { render, waitFor } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { findChip as findChipIn } from '../InlineChoiceNode';
import { useInlineChoicePassage } from '../useInlineChoicePassage';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

/** Query options matching a chip's accessible name in any state. */
export const CHIP = {
  name: new RegExp(`^${qtiEditorStrings.answerDropdownNoCorrect$({ count: 0 }).split(',')[0]}`),
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
export async function renderPassage({ value }) {
  let passage;
  const onReady = jest.fn();
  render(
    {
      components: { TipTapEditor },
      setup() {
        passage = useInlineChoicePassage();
        return { extensions: passage.extensions, insertActions: passage.insertActions };
      },
      data: () => ({ value }),
      methods: { onReady },
      template: `<TipTapEditor
        :value="value"
        mode="edit"
        format="html"
        :extensions="extensions"
        :insertActions="insertActions"
        @ready="onReady"
      />`,
    },
    { router: new VueRouter() },
  );
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  const { selectedResponseIdentifier, selectDropdown } = passage;
  return {
    editor: onReady.mock.calls[0][0],
    selectedResponseIdentifier,
    selectDropdown,
  };
}
