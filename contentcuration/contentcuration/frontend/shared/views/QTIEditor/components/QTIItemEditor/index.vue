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
        :interaction="interactions[0]"
        :mode="mode"
        :showAnswers="showAnswers"
        @update:questionType="type => (currentQuestionType = type)"
        @update:interaction="
          ({ bodyXml, responseDeclarations }) => {
            currentBodyXml.value = bodyXml;
            currentResponseDeclarations.value = responseDeclarations;
          }
        "
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

  import { computed, ref, watch } from 'vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { QuestionType } from '../../constants';
  import useQtiItem from '../../composables/useQtiItem';
  import { reassembleItemXml } from '../../serialization/parseItem';
  import InteractionSection from '../InteractionSection/index.vue';

  export default {
    name: 'QTIItemEditor',

    components: { InteractionSection },

    setup(props, { emit }) {
      const {
        questionNumberLabel$,
        questionNumberAndTypeLabel$,
        closeBtnLabel$,
        questionContentPlaceholder$,
        unknownTypeLabel$,
      } = qtiEditorStrings;

      const { identifier, title, language, interactions } = useQtiItem(props.item.raw_data);

      const questionNumberLabel = computed(() =>
        questionNumberLabel$({
          number: props.index + 1,
          total: props.total,
        }),
      );

      /**
       * Tracks the current question type (a QuestionType value).
       * Initialized to null — populated via the update:questionType event
       * emitted by InteractionSection once the XML is parsed on mount.
       */
      const currentQuestionType = ref(null);

      /**
       * Maps each QuestionType to its localized display label.
       * Add new entries here as more question types are introduced.
       */
      const QUESTION_TYPE_LABELS = {
        [QuestionType.SINGLE_SELECT]: () => qtiEditorStrings.singleChoiceLabel$(),
        [QuestionType.MULTI_SELECT]: () => qtiEditorStrings.multipleChoiceLabel$(),
      };

      const interactionTypeLabel = computed(
        () => QUESTION_TYPE_LABELS[currentQuestionType.value]?.() ?? unknownTypeLabel$(),
      );

      const questionNumberAndTypeLabel = computed(() =>
        questionNumberAndTypeLabel$({
          number: props.index + 1,
          total: props.total,
          type: interactionTypeLabel.value,
        }),
      );

      /**
       * Track the current bodyXml and responseDeclarations for the interaction.
       * Initialised from the parsed item; updated atomically when the editor
       * emits update:interaction.
       */
      const currentBodyXml = ref(
        interactions.value.length > 0 ? interactions.value[0].bodyXml : '',
      );
      const currentResponseDeclarations = ref(
        interactions.value.length > 0 ? interactions.value[0].responseDeclarations : [],
      );

      const rawData = computed(() =>
        reassembleItemXml({
          identifier: identifier.value,
          title: title.value,
          language: language.value,
          bodyXml: currentBodyXml.value,
          responseDeclarations: currentResponseDeclarations.value,
        }),
      );

      // Emit only when the assembled XML actually changes after initial mount
      watch(rawData, newVal => {
        emit('update:rawData', newVal);
      });

      return {
        currentQuestionType,
        interactions,
        questionNumberLabel,
        questionNumberAndTypeLabel,
        closeBtnLabel$,
        questionContentPlaceholder$,
      };
    },

    props: {
      /**
       * Assessment item: { assessment_id, type, raw_data? }
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
      showAnswers: {
        type: Boolean,
        default: false,
      },
    },

    emits: ['close', 'update:rawData'],
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
