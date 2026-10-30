<template>

  <NodeViewWrapper
    as="span"
    role="group"
    :aria-label="accessibleName"
    :class="[
      'gap',
      {
        'is-blank': isBlank,
        'is-read-only': !isEditable,
        'is-concealed': isConcealed,
        'is-revealed': isRevealed,
        'has-errors': hasErrors,
        'has-placeholder': hasPlaceholder,
        'is-selected': isEditable && selected,
      },
    ]"
  >
    <!-- Only where no caret can reach the gap, as the caret handling expects nothing but the
         answer inside it. The accessible name already says what the gap lacks. -->
    <template v-if="hasPlaceholder">
      <KIcon
        v-if="hasErrors"
        icon="error"
        class="error-icon"
        :color="$themeTokens.error"
      />
      <span
        :class="['placeholder', { 'is-concealed': isConcealed }]"
        aria-hidden="true"
      >
        {{ isConcealed ? chooseAnswer$() : errorEmptyChoiceContent$() }}
      </span>
    </template>
    <!-- Tiptap writes `pre-wrap` on the content; a preview keeps the answer on one line. -->
    <NodeViewContent
      as="span"
      class="answer"
      dir="auto"
      :style="isEditable ? null : { whiteSpace: 'nowrap' }"
      :aria-hidden="isConcealed ? 'true' : null"
    />
  </NodeViewWrapper>

</template>


<script>

  import { computed } from 'vue';
  import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-2';
  import { qtiEditorStrings } from '../../../../qtiEditorStrings';
  import { describeGap, gapAnswerText, injectPassageGaps } from '../../passageGaps';

  export default {
    name: 'GapChip',

    components: {
      NodeViewContent,
      NodeViewWrapper,
    },

    setup(props) {
      const { gapIds, isEditable, errorGapIds, showAnswers } = injectPassageGaps();
      const identifier = computed(() => props.node.attrs.identifier);
      const answer = computed(() => gapAnswerText(props.node));
      const isBlank = computed(() => !answer.value.trim());
      const isConcealed = computed(() => !isEditable.value && !showAnswers.value);
      const isRevealed = computed(() => !isEditable.value && showAnswers.value);
      const hasPlaceholder = computed(
        () => isConcealed.value || (isRevealed.value && isBlank.value),
      );
      const hasErrors = computed(() => errorGapIds.value.includes(identifier.value));
      const accessibleName = computed(() =>
        describeGap({
          answer: answer.value,
          number: gapIds.value.indexOf(identifier.value) + 1,
          isConcealed: isConcealed.value,
        }),
      );

      const { chooseAnswer$, errorEmptyChoiceContent$ } = qtiEditorStrings;

      return {
        isEditable,
        isBlank,
        isConcealed,
        isRevealed,
        hasErrors,
        hasPlaceholder,
        accessibleName,
        chooseAnswer$,
        errorEmptyChoiceContent$,
      };
    },

    props: {
      node: {
        type: Object,
        required: true,
      },
      // Set by Tiptap only while the selection covers the whole gap, not part of its answer.
      selected: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  // An empty inline-block has no line box, so a blank gap needs a height of its own. With the
  // content box, that is one line, as in a gap with an answer, and the padding goes around it.
  // Taller than a line of text, so it sits on the text's middle, and no wider than an answer
  // dropdown's label, as an answer dropdown does. While edited, a longer answer wraps, so the
  // author sees all of it; a preview cuts it short.
  .gap {
    box-sizing: content-box;
    display: inline-block;
    min-width: 3em;
    max-width: 20em;
    min-height: 1.5em;
    padding: 10px 8px;
    margin: 2px;
    line-height: 1.5;
    text-align: center;
    vertical-align: middle;
    background-color: var(--palette-green-v100);
    border: 1px solid var(--tokens-correct);
    border-radius: 8px;

    &.is-blank {
      background-color: transparent;
      border-style: dashed;
    }

    &.is-concealed {
      background-color: transparent;
      border-color: var(--palette-grey-v400);
      border-style: dashed;
    }

    // Laid out as an answer dropdown is: the icon does not stretch the line, the space around
    // the text in the template takes no room, and a long answer is cut short at its own end,
    // whichever way it runs.
    &.is-read-only {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      justify-content: center;

      .answer {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    // The answer leaves the layout: hidden, the gap's width would hint at it, and blank, it would
    // add to the space between the items.
    &.has-placeholder .answer {
      display: none;
    }

    &.has-errors {
      border-color: var(--tokens-error);
    }

    // A shown answer that needs attention reads as an error, not as a correct answer.
    &.has-errors.is-revealed {
      background-color: var(--palette-red-v100);
      border-style: solid;

      // `annotation` is below AA contrast on this fill.
      .placeholder {
        color: var(--palette-grey-v800);
      }
    }
  }

  .placeholder {
    overflow: hidden;
    font-weight: bold;
    color: var(--tokens-annotation);
    text-overflow: ellipsis;
    white-space: nowrap;

    // Stands in for the learner's choice rather than naming a problem.
    &.is-concealed {
      font-weight: normal;
    }
  }

  .error-icon {
    top: 0;
    flex-shrink: 0;
    width: 1.5em;
    height: 1.5em;
  }

  // The gap that holds the caret, while the passage has focus, so the author can tell a caret
  // just inside a gap's edge from one just outside it. It turns neutral while it is typed in.
  .ProseMirror-focused .gap.is-active {
    background-color: var(--palette-grey-v100);
    border-color: var(--tokens-fineLine);
    border-style: dashed;
  }

  // A gap the selection covers takes the selection's colour (KDS's global `::selection`), which
  // the browser only paints behind the answer's text, as an answer dropdown does. Last, so it
  // wins over the states above.
  .gap.is-selected {
    background-color: var(--brand-secondary-v100);
    border-color: var(--palette-grey-v400);

    &::selection,
    ::v-deep *::selection {
      background-color: transparent;
    }
  }

</style>


<style lang="scss">

  /* After prosemirror-gapcursor's style/gapcursor.css. */
  .gap-caret {
    display: none;
    width: 0;
    height: 1.2em;
    margin-right: -1px;
    vertical-align: text-bottom;
    pointer-events: none;
    border-left: 1px solid currentcolor;
    animation: gap-caret-blink 1.1s steps(2, start) infinite;
  }

  .ProseMirror-focused .gap-caret {
    display: inline-block;
  }

  .ProseMirror-focused.hides-caret {
    caret-color: transparent;
  }

  @keyframes gap-caret-blink {
    to {
      visibility: hidden;
    }
  }

</style>
