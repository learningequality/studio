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
          'is-revealed': !isEditable && showAnswers,
          'has-errors': hasErrors,
          // TipTap marks a chip selected whenever the selection covers it, text selections
          // included.
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
        :class="[
          'label',
          { placeholder: isConcealed || (!hasAnswer && !optionCount), 'is-concealed': isConcealed },
        ]"
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
      const {
        openResponseIdentifier,
        openDropdown,
        isEditable,
        errorResponseIdentifiers,
        showAnswers,
      } = injectPassageChips();
      const {
        addAnswers$,
        answerDropdownWithCorrect$,
        answerDropdownNoCorrect$,
        answerDropdownWithCorrectNeedsAttention$,
        answerDropdownNoCorrectNeedsAttention$,
        answerDropdownHidden$,
        chooseAnswer$,
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
      // A preview that hides the answers shows what the learner sees before choosing.
      const isConcealed = computed(() => !isEditable.value && !showAnswers.value);
      const label = computed(() => {
        if (isConcealed.value) return chooseAnswer$();
        return hasAnswer.value ? correctText.value : addAnswers$();
      });
      // Starts with the visible label, so voice control finds the chip by what it shows.
      const accessibleName = computed(() => {
        // A preview that hides the answers must not read them out either.
        if (isConcealed.value) {
          return answerDropdownHidden$({ label: label.value, count: optionCount.value });
        }
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
        isConcealed,
        hasErrors,
        label,
        accessibleName,
        isEditable,
        showAnswers,
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

  // Taller than a line of text, so it sits on the text's middle rather than its baseline.
  .chip {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    padding: 10px 8px;
    margin: 2px 0;
    font: inherit;
    line-height: 1.5;
    color: inherit;
    vertical-align: middle;
    cursor: pointer;
    background-color: transparent;
    border: 1px dashed var(--tokens-correct);
    border-radius: 8px;

    &.is-open,
    &.is-revealed {
      background-color: var(--palette-green-v100);
      border-style: solid;
    }

    &.has-errors {
      border-color: var(--tokens-error);
    }

    // A shown answer that needs attention reads as an error, not as a correct answer.
    &.has-errors.is-open,
    &.has-errors.is-revealed {
      background-color: var(--palette-red-v100);

      // `annotation` is below AA contrast on this fill.
      .placeholder {
        color: var(--palette-grey-v800);
      }
    }

    // TipTap only keeps ProseMirror out when the button itself is the event target.
    .badge,
    .label {
      pointer-events: none;
    }

    &::selection,
    *::selection {
      background-color: transparent;
    }
  }

  .label {
    max-width: 20em;
    overflow: hidden;
    font-weight: bold;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.placeholder {
      color: var(--tokens-annotation);
    }

    // Stands in for the learner's choice rather than naming an answer.
    &.is-concealed {
      font-weight: normal;
    }
  }

  .badge {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    min-width: 1.5em;
    height: 1.5em;
    padding: 0 4px;
    font-size: 0.85em;
    color: var(--tokens-textInverted);
    background-color: var(--tokens-correct);
    border-radius: 0.75em;

    .has-errors & {
      background-color: v-bind('$themeTokens.error');
    }
  }

  // A selected chip takes the selection's colours (`::selection` in `shared/styles`), which the
  // browser only paints behind text, and turns neutral so they keep their contrast. Last, and
  // as specific as the open error state, so it wins over the states above.
  .chip.is-selected,
  .chip.is-selected.has-errors.is-open {
    background-color: var(--selection-background-color);
    border-color: var(--palette-grey-v400);

    .badge {
      color: var(--selection-color);
      background-color: transparent;
      box-shadow: inset 0 0 0 1px var(--palette-grey-v400);
    }

    .label {
      color: var(--selection-color);
    }
  }

</style>
