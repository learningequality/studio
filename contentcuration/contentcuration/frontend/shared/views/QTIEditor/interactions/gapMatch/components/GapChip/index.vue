<template>

  <NodeViewWrapper
    as="span"
    role="group"
    :aria-label="accessibleName"
    :class="[
      'gap',
      {
        'is-blank': isBlank,
        'is-concealed': isConcealed,
        'has-errors': hasErrors,
      },
    ]"
  >
    <NodeViewContent
      as="span"
      class="answer"
      dir="auto"
      :aria-hidden="isConcealed ? 'true' : null"
    />
  </NodeViewWrapper>

</template>


<script>

  import { computed } from 'vue';
  import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-2';
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
      const hasErrors = computed(() => errorGapIds.value.includes(identifier.value));
      const accessibleName = computed(() =>
        describeGap({
          answer: answer.value,
          number: gapIds.value.indexOf(identifier.value) + 1,
          isConcealed: isConcealed.value,
        }),
      );

      return { isBlank, isConcealed, hasErrors, accessibleName };
    },

    props: {
      node: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  // An empty inline-block has no line box, so a blank gap needs a height of its own.
  .gap {
    display: inline-block;
    min-width: 3em;
    min-height: 1.5em;
    padding: 0 8px;
    margin: 2px 0;
    vertical-align: bottom;
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

      .answer {
        visibility: hidden;
      }
    }

    &.has-errors {
      border-color: var(--tokens-error);
    }
  }

</style>
