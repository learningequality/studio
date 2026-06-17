<template>

  <KPageContainer
    noPadding
    :topMargin="0"
    class="item question-card"
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

    <div class="question-card-body">
      <InteractionSection
        v-if="interactions.length > 0"
        :block="interactions[0]"
        :mode="mode"
        :displayAnswersPreview="displayAnswersPreview"
      />
      <p
        v-else
        :style="{ color: $themePalette.grey.v_500, margin: 0, fontStyle: 'italic' }"
      >
        {{ questionContentPlaceholder$() }}
      </p>
    </div>

    <div
      v-if="mode === 'edit'"
      class="question-card-footer"
    >
      <KButton
        :text="closeBtnLabel$()"
        class="close-item-btn"
        @click="$emit('close')"
      />
    </div>
  </KPageContainer>

</template>


<script>

  import { computed } from 'vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { QtiInteraction } from '../../constants';
  import useInteractionDescriptor from '../../composables/useInteractionDescriptor';
  import useQtiItem from '../../composables/useQtiItem';
  import InteractionSection from '../InteractionSection/index.vue';

  // QTI interaction tag name → i18n string key, used for closed-card labels
  // on items that have no raw_data yet (blank new items).
  const INTERACTION_TYPE_STRING_KEY = {
    [QtiInteraction.CHOICE]: 'interactionTypeSingleChoice', // defaults to single choice if no XML yet
    [QtiInteraction.ORDER]: 'interactionTypeOrder',
    [QtiInteraction.MATCH]: 'interactionTypeMatch',
    [QtiInteraction.TEXT_ENTRY]: 'interactionTypeTextEntry',
    [QtiInteraction.EXTENDED_TEXT]: 'interactionTypeExtendedText',
  };

  export default {
    name: 'QTIItemEditor',

    components: { InteractionSection },

    setup(props) {
      const {
        questionNumberLabel$,
        questionNumberAndTypeLabel$,
        closeBtnLabel$,
        questionContentPlaceholder$,
        interactionTypeUnknown$,
      } = qtiEditorStrings;

      const { interactions } = useQtiItem(props.item.raw_data);

      const questionNumberLabel = computed(() =>
        questionNumberLabel$({
          number: props.index + 1,
          total: props.total,
        }),
      );

      const firstBlockXml = computed(() =>
        interactions.value.length > 0 ? interactions.value[0].bodyXml : null,
      );
      const { descriptor, questionType } = useInteractionDescriptor(firstBlockXml);

      /**
       * Derives the type label for the closed-card header.
       * When raw_data is present: parses the first interaction's bodyXml and uses
       * the matching descriptor's label — this is the source of truth from the XML.
       * When raw_data is absent (blank new items): falls back to item.type enum lookup.
       */
      const interactionTypeLabel = computed(() => {
        if (firstBlockXml.value) {
          if (descriptor.value?.type === QtiInteraction.CHOICE) {
            return questionType.value === 'singleSelect'
              ? qtiEditorStrings.interactionTypeSingleChoice$()
              : qtiEditorStrings.interactionTypeMultipleChoice$();
          }
          return descriptor.value ? descriptor.value.label : interactionTypeUnknown$();
        }
        const typeKey = INTERACTION_TYPE_STRING_KEY[props.item.type];
        return typeKey ? qtiEditorStrings[`${typeKey}$`]() : interactionTypeUnknown$();
      });

      const questionNumberAndTypeLabel = computed(() =>
        questionNumberAndTypeLabel$({
          number: props.index + 1,
          total: props.total,
          type: interactionTypeLabel.value,
        }),
      );

      return {
        interactions,
        questionNumberLabel,
        questionNumberAndTypeLabel,
        closeBtnLabel$,
        questionContentPlaceholder$,
      };
    },

    props: {
      /**
       * Assessment item: { id, type (QtiInteraction value), title, raw_data? }
       * raw_data is the full QTI XML string; absent on blank newly-created items.
       */
      item: {
        type: Object,
        required: true,
      },
      /** 0-based position in the list */
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
      /** Whether to show answer previews for closed items */
      displayAnswersPreview: {
        type: Boolean,
        default: false,
      },
    },

    emits: ['close'],
  };

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
