<template>

  <NodeViewWrapper
    as="span"
    role="img"
    :aria-label="accessibleName"
    :aria-current="isSelected ? 'true' : null"
    :class="['chip', { 'has-answer': hasAnswer, 'is-selected': isSelected }]"
    @click.native="select"
  >
    <span
      class="badge"
      aria-hidden="true"
      data-copy-ignore
    >
      {{ $formatNumber(optionCount) }}
    </span>
    <span
      class="label"
      dir="auto"
      aria-hidden="true"
      data-copy-ignore
    >
      {{ label }}
    </span>
    <!-- The toolbar Copy button copies the node view's DOM, minus `data-copy-ignore`. -->
    <span
      ref="copySource"
      hidden
    ></span>
  </NodeViewWrapper>

</template>


<script>

  import { computed, ref, watch, watchEffect } from 'vue';
  // The resolver does not read package `exports` subpaths.
  // eslint-disable-next-line import/no-unresolved
  import { DOMSerializer } from '@tiptap/pm/model';
  import { NodeViewWrapper } from '@tiptap/vue-2';
  import { qtiEditorStrings } from '../../../../qtiEditorStrings';
  import { injectPassageSelection } from '../../passageSelection';

  export default {
    name: 'InlineChoiceChip',

    components: {
      NodeViewWrapper,
    },

    setup(props) {
      const { selectedResponseIdentifier, selectDropdown } = injectPassageSelection();
      const { addAnswer$, addAnswers$, answerDropdownWithCorrect$, answerDropdownNoCorrect$ } =
        qtiEditorStrings;

      const responseIdentifier = computed(() => props.node.attrs.responseIdentifier);
      const optionCount = computed(
        () => props.node.attrs.options.filter(option => option.text.trim()).length,
      );
      const correctText = computed(() => {
        const correct = props.node.attrs.options.find(
          option => option.id === props.node.attrs.correctId,
        );
        return correct ? correct.text.trim() : '';
      });
      const hasAnswer = computed(() => correctText.value !== '');
      const label = computed(() => {
        if (hasAnswer.value) return correctText.value;
        return optionCount.value ? addAnswer$() : addAnswers$();
      });
      const accessibleName = computed(() =>
        hasAnswer.value
          ? answerDropdownWithCorrect$({ count: optionCount.value, answer: correctText.value })
          : answerDropdownNoCorrect$({ count: optionCount.value }),
      );

      const select = () => selectDropdown(responseIdentifier.value);

      // `selected` is also set when a text range merely covers the chip, which must not
      // change the dropdown.
      const isNodeSelected = () => {
        const { selection } = props.editor.state;
        return Boolean(selection.node) && selection.from === props.getPos();
      };
      watch(
        () => props.selected && isNodeSelected(),
        selected => selected && select(),
        { immediate: true },
      );

      const copySource = ref(null);
      watchEffect(
        () => {
          if (!copySource.value) return;
          const serializer = DOMSerializer.fromSchema(props.editor.schema);
          copySource.value.replaceChildren(serializer.serializeNode(props.node));
        },
        { flush: 'post' },
      );

      return {
        copySource,
        select,
        optionCount,
        hasAnswer,
        label,
        accessibleName,
        isSelected: computed(() => selectedResponseIdentifier.value === responseIdentifier.value),
      };
    },

    props: {
      node: {
        type: Object,
        required: true,
      },
      selected: {
        type: Boolean,
        default: false,
      },
      editor: {
        type: Object,
        required: true,
      },
      getPos: {
        type: Function,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .chip {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 0 8px;
    cursor: pointer;
    background-color: v-bind('$themePalette.grey.v_50');
    border: 1px dashed v-bind('$themePalette.grey.v_700');
    border-radius: 12px;

    &.has-answer {
      background-color: v-bind('$themeTokens.surface');
      border-color: v-bind('$themeTokens.primary');
      border-style: solid;
    }

    &.is-selected {
      outline: 2px solid v-bind('$themeTokens.primary');
      outline-offset: 1px;
    }
  }

  .label {
    max-width: 20em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    min-width: 1.4em;
    padding: 0 4px;
    font-size: 0.85em;
    font-weight: 600;
    text-align: center;
    background-color: v-bind('$themePalette.grey.v_200');
    border-radius: 10px;
  }

  .has-answer .badge {
    color: v-bind('$themeTokens.textInverted');
    background-color: v-bind('$themeTokens.primary');
  }

</style>
