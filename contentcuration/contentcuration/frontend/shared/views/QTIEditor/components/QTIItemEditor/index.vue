<template>

  <!--
    a11y: The whole closed card opens on click, as a shortcut for pointer users only. It is
    deliberately not a ClickableRegion: keyboard and screen reader users already have the
    Edit button in the card's toolbar, which does the same thing, so a second focusable
    control covering the card would just add a redundant tab stop and announcement.
  -->
  <KPageContainer
    ref="card"
    noPadding
    :topMargin="0"
    class="item question-card"
    :class="{ 'is-clickable': canOpen }"
    @click.native="onCardClick"
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
        <!-- .stop: the toolbar actions handle their own clicks, which must not open the card -->
        <div @click.stop>
          <slot
            name="toolbarActions"
            :canOpen="canOpen"
          ></slot>
        </div>
      </div>
    </div>

    <div class="question-card-body">
      <p
        v-if="isUnsupported"
        :style="{ color: $themeTokens.annotation, margin: 0, fontStyle: 'italic' }"
        data-testid="unsupportedMessage"
      >
        {{ unsupportedMessage }}
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
        :style="{ color: $themeTokens.annotation, margin: 0, fontStyle: 'italic' }"
      >
        {{ questionContentPlaceholder$() }}
      </p>

      <!-- .stop: expanding or collapsing the hints must not open the card -->
      <HintsSection
        v-if="showHints"
        :hints="hints"
        :mode="mode"
        @update:hints="onUpdateHints"
        @click.native.stop
      />
    </div>

    <div
      v-if="mode === 'edit'"
      class="question-card-footer"
    >
      <!--
        .stop: closing re-renders the card closed, and removes this footer, before the click
        finishes bubbling, so it would reach the card as a click on a closed card and reopen
        it. It has to stop here, in the button's own listener: one on the footer is detached
        by that re-render before the click gets to it.
      -->
      <KButton
        :text="closeBtnLabel$()"
        class="close-item-btn"
        @click.stop="$emit('close')"
      />
    </div>
  </KPageContainer>

</template>


<script>

  import { computed, onMounted, ref, watch } from 'vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { AssessmentItemTypes, QuestionType } from '../../constants';
  import useQtiItem from '../../composables/useQtiItem';
  import { validateItemShape, validateQtiItem } from '../../validateItem';
  import { isSupportedItem } from '../../interactions/resolveDescriptor';
  import InteractionSection from '../InteractionSection/index.vue';
  import HintsSection from '../HintsSection/index.vue';

  export default {
    name: 'QTIItemEditor',

    components: { InteractionSection, HintsSection },

    setup(props, { emit, listeners }) {
      const {
        questionNumberLabel$,
        questionNumberAndTypeLabel$,
        closeBtnLabel$,
        questionContentPlaceholder$,
        unknownTypeLabel$,
        incompleteItemIndicatorLabel$,
        unsupportedItemMessage$,
        deleteUnsupportedItemMessage$,
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
        { bodyXml: currentBodyXml, responseDeclarations: currentResponseDeclarations },
      );

      const isQti = computed(() => props.item.type === AssessmentItemTypes.QTI);

      /**
       * Whether this editor can edit the item's XML faithfully: it is readable, and it is
       * either blank or holds exactly one interaction this editor knows, in the body shape its
       * builder writes.
       */
      const isBlank = !props.item.raw_data;
      const isEditableQti = computed(
        () =>
          !parseError.value && (isBlank || isSupportedItem(interactions.value, itemBodyXml.value)),
      );

      /**
       * Items authored outside this editor (e.g. Perseus questions) and QTI it cannot edit
       * faithfully are shown as read-only cards.
       */
      const isUnsupported = computed(() => !isQti.value || !isEditableQti.value);

      /*
       * Seed the editor refs from the parsed item's first block, which for an inline
       * passage holds every declaration.
       */
      if (interactions.value.length > 0) {
        currentBodyXml.value = interactions.value[0].bodyXml;
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
          [QuestionType.ASSOCIATE]: qtiEditorStrings.associateLabel$,
          [QuestionType.MATCH]: qtiEditorStrings.matchLabel$,
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
      let lastReported = null;

      // Watch the inputs, not rawData: watching the computed would assemble it for every card
      // on screen, logging assembly warnings for items nobody is saving.
      // Emit only when the assembled XML actually changes after initial mount.
      watch([currentBodyXml, currentResponseDeclarations, hints], () => {
        if (!editedHere) return;
        editedHere = false;
        const newVal = rawData.value;
        if (newVal === lastReported) return;
        lastReported = newVal;
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

      const showHints = computed(
        () => hasHints && (props.mode === 'edit' ? !isUnsupported.value : props.showAnswers),
      );

      function onUpdateHints(newHints) {
        editedHere = props.mode === 'edit';
        hints.value = newHints;
      }

      /**
       * Whether this card can be opened for editing, by a click on the card or by its toolbar's
       * Edit action. Only the card knows whether its XML could be read, and a consumer that
       * does not listen for `open` gets no affordance.
       */
      const canOpen = computed(
        () => props.mode === 'view' && !isUnsupported.value && Boolean(listeners.open),
      );

      function onCardClick(event) {
        if (!canOpen.value) return;
        // The click would otherwise carry on to the rich text editor's click-outside handler
        // on `document`, which minimizes the question this just opened.
        event.stopPropagation();
        emit('open');
      }

      const card = ref(null);

      function scrollToStart() {
        card.value.$el.scrollIntoView({ block: 'start' });
      }

      onMounted(() => {
        if (props.mode === 'edit') scrollToStart();
      });

      watch(
        () => props.mode,
        mode => {
          if (mode === 'edit') scrollToStart();
        },
        // After the re-render, so the card's position is where it has settled.
        { flush: 'post' },
      );

      /** Errors the interaction editor reports about the state it holds. */
      const errors = ref([]);

      function onUpdateErrors(newErrors) {
        errors.value = newErrors;
      }

      /**
       * Unreadable or empty QTI can't be fixed here and blocks publishing; other unsupported
       * items are publishable.
       */
      const isUnfixable = computed(
        () =>
          isUnsupported.value &&
          isQti.value &&
          validateQtiItem(props.item.raw_data, { allowFreeResponse: props.allowFreeResponse })
            .length > 0,
      );

      const unsupportedMessage = computed(() =>
        isUnfixable.value && props.canDelete
          ? deleteUnsupportedItemMessage$()
          : unsupportedItemMessage$(),
      );

      /**
       * Whether the question is missing something an author still has to supply.
       */
      const isIncomplete = computed(() => {
        if (isUnsupported.value) {
          return isUnfixable.value;
        }
        const itemErrors = validateItemShape({
          interactions: interactions.value,
          questionTypes: [currentQuestionType.value],
          allowFreeResponse: props.allowFreeResponse,
        });
        return itemErrors.length > 0 || errors.value.length > 0;
      });

      return {
        card,
        currentQuestionType,
        interactions,
        currentInteraction,
        isUnsupported,
        unsupportedMessage,
        isIncomplete,
        canOpen,
        onCardClick,
        questionNumberLabel,
        questionNumberAndTypeLabel,
        closeBtnLabel$,
        questionContentPlaceholder$,
        incompleteItemIndicatorLabel$,
        onUpdateInteraction,
        onUpdateErrors,
        hints,
        showHints,
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
      /** Whether the toolbar actions offer Delete, so an unfixable question can point to it */
      canDelete: {
        type: Boolean,
        default: false,
      },
    },

    emits: ['open', 'close', 'update:rawData'],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .question-card {
    --question-card-horizontal-padding: 20px;

    padding: 0;
    // Room for the tab bar above, so an opened card is not scrolled in under it.
    scroll-margin-top: 64px;

    &.is-clickable {
      cursor: pointer;
      transition: box-shadow $core-time ease;

      &:hover {
        @extend %dropshadow-6dp;
      }
    }
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
