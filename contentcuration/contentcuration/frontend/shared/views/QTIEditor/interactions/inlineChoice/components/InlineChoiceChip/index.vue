<template>

  <NodeViewWrapper as="span">
    <!-- A real button: TipTap keeps ProseMirror out of a button's events, so Enter and Space
         reach it. A read-only passage gets no Tab stop or popup. -->
    <component
      :is="isEditable ? 'button' : 'span'"
      v-bind="controlAttrs"
      :aria-label="accessibleName"
      :class="[
        'chip',
        {
          'is-open': isEditable && isOpen,
          'has-errors': hasErrors,
          'is-selected': isEditable && selected,
        },
        $computedClass({ ':focus': $coreOutline }),
      ]"
      data-copy-ignore
      @click="isEditable && open()"
    >
      <span class="badge">
        {{ $formatNumber(optionCount) }}
      </span>
      <span
        :class="['label', { placeholder: !hasAnswer }]"
        dir="auto"
      >
        {{ label }}
      </span>
    </component>
    <!-- The toolbar Copy button copies the node view's DOM, minus `data-copy-ignore`. -->
    <span
      ref="copySource"
      hidden
    ></span>
  </NodeViewWrapper>

</template>


<script>

  import { computed, ref, watchEffect } from 'vue';
  // The resolver does not read package `exports` subpaths.
  // eslint-disable-next-line import/no-unresolved
  import { DOMSerializer } from '@tiptap/pm/model';
  import { NodeViewWrapper } from '@tiptap/vue-2';
  import { qtiEditorStrings } from '../../../../qtiEditorStrings';
  import { injectPassageChips } from '../../passageChips';

  export default {
    name: 'InlineChoiceChip',

    components: {
      NodeViewWrapper,
    },

    setup(props) {
      const { openResponseIdentifier, openDropdown, isEditable, errorResponseIdentifiers } =
        injectPassageChips();
      const {
        addAnswers$,
        answerDropdownWithCorrect$,
        answerDropdownNoCorrect$,
        answerDropdownWithCorrectNeedsAttention$,
        answerDropdownNoCorrectNeedsAttention$,
      } = qtiEditorStrings;

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
      const hasErrors = computed(() =>
        errorResponseIdentifiers.value.includes(responseIdentifier.value),
      );
      const label = computed(() => (hasAnswer.value ? correctText.value : addAnswers$()));
      // Starts with the visible label, so voice control finds the chip by what it shows.
      const accessibleName = computed(() => {
        const name = hasAnswer.value
          ? hasErrors.value
            ? answerDropdownWithCorrectNeedsAttention$
            : answerDropdownWithCorrect$
          : hasErrors.value
            ? answerDropdownNoCorrectNeedsAttention$
            : answerDropdownNoCorrect$;
        return name({ label: label.value, count: optionCount.value });
      });

      const isOpen = computed(() => openResponseIdentifier.value === responseIdentifier.value);
      const controlAttrs = computed(() =>
        isEditable.value
          ? { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': String(isOpen.value) }
          : { role: 'img' },
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
        open: () => openDropdown(responseIdentifier.value),
        optionCount,
        hasAnswer,
        hasErrors,
        label,
        accessibleName,
        isEditable,
        isOpen,
        controlAttrs,
      };
    },

    props: {
      node: {
        type: Object,
        required: true,
      },
      editor: {
        type: Object,
        required: true,
      },
      selected: {
        type: Boolean,
        default: false,
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
    font: inherit;
    color: inherit;
    cursor: pointer;
    background-color: transparent;
    border: 1px dashed v-bind('$themeTokens.correct');
    border-radius: 12px;

    &.is-open {
      background-color: v-bind('$themePalette.green.v_100');
      border-style: solid;
    }

    &.has-errors {
      border-color: v-bind('$themeTokens.error');
    }

    &.has-errors.is-open {
      background-color: v-bind('$themePalette.red.v_100');

      // `annotation` is below AA contrast on this fill.
      .placeholder {
        color: v-bind('$themePalette.grey.v_800');
      }
    }

    // TipTap only keeps ProseMirror out when the button itself is the event target.
    .badge,
    .label {
      pointer-events: none;
    }

    // ProseMirror hides the caret while a chip is node-selected.
    &.is-selected {
      outline: 2px solid v-bind('$themeTokens.primary');
      outline-offset: 1px;
    }
  }

  .label {
    max-width: 20em;
    overflow: hidden;
    font-weight: bold;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.placeholder {
      color: v-bind('$themeTokens.annotation');
    }
  }

  .badge {
    min-width: 1.4em;
    padding: 0 4px;
    font-size: 0.85em;
    font-weight: 600;
    color: v-bind('$themeTokens.textInverted');
    text-align: center;
    background-color: v-bind('$themeTokens.correct');
    border-radius: 10px;

    .has-errors & {
      background-color: v-bind('$themeTokens.error');
    }
  }

</style>
