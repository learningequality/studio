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
        <span
          v-if="isIncomplete"
          class="incomplete-indicator"
          :style="{ color: $themeTokens.error }"
          data-testid="incompleteIndicator"
        >
          <KIcon
            icon="error"
            :color="$themeTokens.error"
          />
          <span>{{ incompleteItemIndicatorLabel$() }}</span>
        </span>
        <slot name="toolbarActions"></slot>
      </div>
    </div>

    <div class="question-card-body">
      <p
        v-if="isUnsupported"
        :style="{ color: $themePalette.grey.v_500, margin: 0, fontStyle: 'italic' }"
        data-testid="unsupportedMessage"
      >
        {{ unsupportedItemMessage$() }}
      </p>
      <InteractionSection
        v-else-if="interactions.length > 0"
        :interaction="currentInteraction"
        :mode="mode"
        :showAnswers="showAnswers"
        :allowFreeResponse="allowFreeResponse"
        @update:questionType="type => (currentQuestionType = type)"
        @update:interaction="onUpdateInteraction"
        @update:errors="onUpdateErrors"
      />
      <p
        v-else
        :style="{ color: $themePalette.grey.v_500, margin: 0, fontStyle: 'italic' }"
      >
        {{ questionContentPlaceholder$() }}
      </p>

      <HintsSection
        v-if="hasHints && (mode === 'edit' || showAnswers)"
        :hints="hints"
        :mode="mode"
        @update:hints="onUpdateHints"
      />
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
  import { AssessmentItemTypes, QuestionType } from '../../constants';
  import useQtiItem from '../../composables/useQtiItem';
  import { validateItemShape } from '../../validateItem';
  import InteractionSection from '../InteractionSection/index.vue';
  import HintsSection from '../HintsSection/index.vue';

  export default {
    name: 'QTIItemEditor',

    components: { InteractionSection, HintsSection },

    setup(props, { emit }) {
      const {
        questionNumberLabel$,
        questionNumberAndTypeLabel$,
        closeBtnLabel$,
        questionContentPlaceholder$,
        unknownTypeLabel$,
        incompleteItemIndicatorLabel$,
        unsupportedItemMessage$,
      } = qtiEditorStrings;

      /**
       * Track the current bodyXml and responseDeclarations for the interaction.
       * Initialised after parsing; updated atomically when the editor emits
       * update:interaction. Declared before useQtiItem so they can be passed in
       * and observed by the rawData computed inside the composable.
       */
      const currentBodyXml = ref('');
      const currentResponseDeclarations = ref([]);

      // Parse the item XML. rawData is a computed inside useQtiItem that
      // re-assembles the full XML whenever identifier/title/language or the
      // editor refs change — no need to duplicate assembleItemXml here.
      const { interactions, itemBodyXml, hints, parseError, rawData } = useQtiItem(
        props.item.raw_data,
        {
          bodyXml: currentBodyXml,
          responseDeclarations: currentResponseDeclarations,
        },
      );

      /**
       * Items authored outside this editor (e.g. Perseus questions) and items whose XML
       * cannot be read are shown as read-only cards.
       */
      const isUnsupported = computed(
        () => props.item.type !== AssessmentItemTypes.QTI || Boolean(parseError.value),
      );

      /*
       * Seed the editor refs from the parsed item (first interaction only).
       *
       * The body is seeded even when there is no interaction to edit. Such an item still has
       * content — its own text, and any interaction this editor has no descriptor for — and
       * anything else the author can change, a hint, reassembles the whole item. Leaving the
       * body unseeded would write an empty <qti-item-body/> over that text.
       */
      currentBodyXml.value = interactions.value[0]?.bodyXml ?? itemBodyXml.value;
      if (interactions.value.length > 0) {
        currentResponseDeclarations.value = interactions.value[0].responseDeclarations;
      }

      const currentInteraction = computed(() => ({
        bodyXml: currentBodyXml.value,
        responseDeclarations: currentResponseDeclarations.value,
      }));

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

      const interactionTypeLabel = computed(() => {
        const type = currentQuestionType.value;
        if (!type) return unknownTypeLabel$();
        const QUESTION_TYPE_LABELS = {
          [QuestionType.SINGLE_SELECT]: qtiEditorStrings.singleSelectLabel$,
          [QuestionType.MULTI_SELECT]: qtiEditorStrings.multiSelectLabel$,
          [QuestionType.NUMERIC]: qtiEditorStrings.numericLabel$,
          [QuestionType.TEXT_ENTRY]: qtiEditorStrings.textEntryLabel$,
          [QuestionType.FREE_RESPONSE]: qtiEditorStrings.freeResponseLabel$,
          [QuestionType.ORDERING]: qtiEditorStrings.orderingLabel$,
        };
        return (QUESTION_TYPE_LABELS[type] ?? unknownTypeLabel$)();
      });

      const questionNumberAndTypeLabel = computed(() =>
        questionNumberAndTypeLabel$({
          number: props.index + 1,
          total: props.total,
          type: interactionTypeLabel.value,
        }),
      );

      /**
       * Whether the change the watcher below is about to report came from an edit in this
       * card. Recorded as the change happens rather than read from `mode` when the watcher
       * flushes: closing the card sets the parent's active item to none, and that re-render
       * lands first, so a change made just before the close would look like it came from a
       * card nobody was editing.
       */
      let editedHere = false;

      // Emit only when the assembled XML actually changes after initial mount.
      watch(rawData, newVal => {
        if (!editedHere) return;
        editedHere = false;
        if (process.env.NODE_ENV === 'development') {
          // debug to help devs understand what the editor is sending to the parent
          // eslint-disable-next-line no-console
          console.debug('[QTIItemEditor] assembled XML:\n', newVal);
        }
        emit('update:rawData', newVal);
      });

      function onUpdateInteraction({ bodyXml, responseDeclarations }) {
        editedHere = props.mode === 'edit';
        currentBodyXml.value = bodyXml;
        currentResponseDeclarations.value = responseDeclarations;
      }

      /**
       * Whether this question offers hints at all, which is settled by what the item arrived
       * with: only a question that already has them shows the section (product decision).
       *
       * Read once from the parsed item rather than from the live list, so removing the last
       * hint does not take the section away while the author is still working in it.
       */
      const hasHints = hints.value.length > 0;

      function onUpdateHints(newHints) {
        editedHere = props.mode === 'edit';
        hints.value = newHints;
      }

      /** Errors the interaction editor reports about the state it holds. */
      const errors = ref([]);

      function onUpdateErrors(newErrors) {
        errors.value = newErrors;
      }

      /**
       * Whether the question is missing something an author still has to supply.
       */
      const isIncomplete = computed(() => {
        if (isUnsupported.value) {
          return false;
        }
        const itemErrors = validateItemShape({
          interactions: interactions.value,
          questionTypes: [currentQuestionType.value],
          allowFreeResponse: props.allowFreeResponse,
        });
        return itemErrors.length > 0 || errors.value.length > 0;
      });

      return {
        currentQuestionType,
        interactions,
        currentInteraction,
        isUnsupported,
        isIncomplete,
        questionNumberLabel,
        questionNumberAndTypeLabel,
        closeBtnLabel$,
        questionContentPlaceholder$,
        incompleteItemIndicatorLabel$,
        unsupportedItemMessage$,
        onUpdateInteraction,
        onUpdateErrors,
        hints,
        hasHints,
        onUpdateHints,
      };
    },

    props: {
      /**
       * Assessment item: { assessment_id, type, raw_data }
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
      /**
       * Whether a question with no correct answer counts as complete. Only a survey
       * accepts those, so a consumer that scores its questions passes false.
       */
      allowFreeResponse: {
        type: Boolean,
        default: true,
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

  .incomplete-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .question-card-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    padding: 10px var(--question-card-horizontal-padding) 16px;
  }

  .question-card-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0 var(--question-card-horizontal-padding) 16px;
  }

</style>
