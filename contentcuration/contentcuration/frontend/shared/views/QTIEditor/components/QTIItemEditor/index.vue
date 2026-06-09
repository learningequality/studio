<template>

  <KPageContainer
    noPadding
    :topMargin="0"
    class="item question-card"
    :class="{ closed: !isOpen }"
    data-test="item"
    @click.native="onCardClick"
  >
    <div
      class="question-card-header"
      :style="{ borderBottom: isOpen ? `1px solid ${$themePalette.grey.v_200}` : 'none' }"
    >
      <h3
        class="question-card-title"
        :style="{ color: $themePalette.grey.v_800 }"
      >
        <template v-if="isOpen">
          {{ questionNumberLabel }}
        </template>
        <template v-else>
          {{ questionNumberAndTypeLabel }}
        </template>
      </h3>

      <div class="question-card-actions toolbar">
        <AssessmentItemToolbar
          :iconActionsConfig="iconActionsConfig"
          :menuActionsConfig="menuActionsConfig"
          :displayMenu="true"
          :canMoveUp="canMoveUp"
          :canMoveDown="canMoveDown"
          :canEdit="!isOpen"
          :collapse="windowIsSmall"
          :itemLabel="toolbarItemLabel"
          analyticsLabel="QTI Question"
          data-test="toolbar"
          @click="action => $emit('action', action)"
        />
      </div>
    </div>

    <div
      v-if="isOpen || displayAnswersPreview"
      class="question-card-body"
    >
      <p :style="{ color: $themePalette.grey.v_500, margin: 0, fontStyle: 'italic' }">
        {{ questionContentPlaceholder }}
      </p>
    </div>

    <div
      v-if="isOpen"
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
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { useQTIStr } from '../../qtiEditorStrings';
  import { QtiInteraction } from '../../constants';
  import AssessmentItemToolbar from 'frontend/channelEdit/components/AssessmentItemToolbar';
  import { AssessmentItemToolbarActions } from 'frontend/channelEdit/constants';

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

    components: { AssessmentItemToolbar },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();

      const questionNumberLabel = computed(() =>
        useQTIStr('questionNumberLabel', {
          number: props.index,
          total: props.total,
        }),
      );

      const questionNumberAndTypeLabel = computed(() => {
        const typeKey = INTERACTION_TYPE_STRING_KEY[props.item.type];
        const typeLabel = typeKey ? useQTIStr(typeKey) : useQTIStr('interactionTypeUnknown');
        return useQTIStr('questionNumberAndTypeLabel', {
          number: props.index,
          total: props.total,
          type: typeLabel,
        });
      });
      const toolbarItemLabel = useQTIStr('toolbarItemLabel');
      const closeBtnLabel = useQTIStr('closeBtnLabel');
      const questionContentPlaceholder = useQTIStr('questionContentPlaceholder');

      const canMoveUp = computed(() => props.index > 1);
      const canMoveDown = computed(() => props.index < props.total);

      const iconActionsConfig = [
        [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
        [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
      ];
      const menuActionsConfig = [
        AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
        AssessmentItemToolbarActions.ADD_ITEM_BELOW,
        AssessmentItemToolbarActions.DELETE_ITEM,
      ];

      function onCardClick(event) {
        if (props.isOpen) return;
        if (
          event.target.closest('.toolbar') !== null ||
          event.target.closest('.close-item-btn') !== null
        ) {
          return;
        }
        emit('open');
      }

      return {
        windowIsSmall,
        questionNumberLabel,
        questionNumberAndTypeLabel,
        toolbarItemLabel,
        closeBtnLabel,
        questionContentPlaceholder,
        canMoveUp,
        canMoveDown,
        iconActionsConfig,
        menuActionsConfig,
        onCardClick,
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
      /** Whether this card is currently expanded */
      isOpen: {
        type: Boolean,
        default: false,
      },
      /** Whether to show answers previews for closed items */
      displayAnswersPreview: {
        type: Boolean,
        default: false,
      },
    },
  });

</script>


<style lang="scss" scoped>

  .question-card {
    --question-card-horizontal-padding: 20px;

    position: relative;
    min-height: 75px;
    padding: 0;
    margin-bottom: 16px;

    &.closed {
      cursor: pointer;
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
