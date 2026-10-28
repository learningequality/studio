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
  import { describeGap, injectPassageGaps } from '../../passageGaps';

  export default {
    name: 'GapChip',

    components: {
      NodeViewContent,
      NodeViewWrapper,
    },

    setup(props) {
      const { gapIds, isEditable, errorGapIds, showAnswers } = injectPassageGaps();
      const identifier = computed(() => props.node.attrs.identifier);
      const isBlank = computed(() => props.node.content.size === 0);
      const isConcealed = computed(() => !isEditable.value && !showAnswers.value);
      const hasErrors = computed(() => errorGapIds.value.includes(identifier.value));
      const accessibleName = computed(() =>
        describeGap({
          answer: props.node.textContent,
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

  .gap {
    display: inline-block;
    min-width: 3em;
    padding: 0 8px;
    margin: 2px 0;
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
