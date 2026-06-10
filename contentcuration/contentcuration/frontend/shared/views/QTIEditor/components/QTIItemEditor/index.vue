<template>

  <KPageContainer
    noPadding
    :topMargin="0"
    class="item question-card"
    data-test="item"
  >
    <div
      class="question-card-header"
      :style="{ borderBottom: mode === 'edit' ? `1px solid ${$themeTokens.fineLine}` : 'none' }"
    >
      <h3
        class="question-card-title"
        :style="{ color: $themePalette.grey.v_800 }"
      >
        <template v-if="mode === 'edit'">
          {{ questionNumberLabel }}
        </template>
        <template v-else>
          {{ questionNumberAndTypeLabel }}
        </template>
      </h3>

      <div class="question-card-actions toolbar">
        <slot name="toolbarActions"></slot>
      </div>
    </div>

    <div
      v-if="mode === 'edit' || displayAnswersPreview"
      class="question-card-body"
    >
      <p :style="{ color: $themePalette.grey.v_500, margin: 0, fontStyle: 'italic' }">
        {{ questionContentPlaceholder }}
      </p>
    </div>

    <div
      v-if="mode === 'edit'"
      class="question-card-footer"
    >
      <KButton
        :text="closeBtnLabel"
        class="close-item-btn"
        data-test="closeBtn"
        @click="$emit('close')"
      />
    </div>
  </KPageContainer>

</template>


<script>

  import { computed, defineComponent } from 'vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { QtiInteraction } from '../../constants';

  // QTI XML element name → i18n string key, used to build closed-card labels.
  const INTERACTION_TYPE_STRING_KEY = {
    [QtiInteraction.CHOICE]: 'interactionTypeChoice',
    [QtiInteraction.ORDER]: 'interactionTypeOrder',
    [QtiInteraction.MATCH]: 'interactionTypeMatch',
    [QtiInteraction.TEXT_ENTRY]: 'interactionTypeTextEntry',
    [QtiInteraction.EXTENDED_TEXT]: 'interactionTypeExtendedText',
  };

  export default defineComponent({
    name: 'QTIItemEditor',

    setup(props) {
      const {
        questionNumberLabel$,
        questionNumberAndTypeLabel$,
        closeBtnLabel$,
        questionContentPlaceholder$,
        interactionTypeUnknown$,
      } = qtiEditorStrings;

      const questionNumberLabel = computed(() =>
        questionNumberLabel$({
          number: props.index,
          total: props.total,
        }),
      );

      const questionNumberAndTypeLabel = computed(() => {
        const typeKey = INTERACTION_TYPE_STRING_KEY[props.item.type];
        const typeLabel = typeKey ? qtiEditorStrings[`${typeKey}$`]() : interactionTypeUnknown$();
        return questionNumberAndTypeLabel$({
          number: props.index,
          total: props.total,
          type: typeLabel,
        });
      });

      const closeBtnLabel = closeBtnLabel$();
      const questionContentPlaceholder = questionContentPlaceholder$();

      return {
        questionNumberLabel,
        questionNumberAndTypeLabel,
        closeBtnLabel,
        questionContentPlaceholder,
      };
    },

    props: {
      /** Assessment item: { id, type (QtiInteraction value), title } */
      item: {
        type: Object,
        required: true,
      },
      /** 1-based position in the list */
      index: {
        type: Number,
        required: true,
      },
      /** Total items in the list */
      total: {
        type: Number,
        required: true,
      },
      /** Whether this card is currently in view or edit mode */
      mode: {
        type: String,
        default: 'view',
        validator: val => ['view', 'edit'].includes(val),
      },
      /** Whether to show answers previews for closed items */
      displayAnswersPreview: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['close'],
  });

</script>


<style lang="scss" scoped>

  .question-card {
    --question-card-horizontal-padding: 20px;

    padding: 0;
  }

  .question-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px var(--question-card-horizontal-padding);
  }

  .question-card-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .question-card-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .question-card-body {
    min-width: 0;
    padding: 10px var(--question-card-horizontal-padding);
  }

  .question-card-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0 var(--question-card-horizontal-padding) 20px;
  }

</style>
