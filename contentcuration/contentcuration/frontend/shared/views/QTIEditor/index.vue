<template>

  <div :style="containerStyle">
    <template v-if="items && items.length">
      <KPageContainer
        class="show-answers-container"
        :topMargin="0"
        noPadding
      >
        <div class="show-answers-inner">
          <KCheckbox
            v-model="showAnswers"
            :label="showAnswers$()"
            class="ma-0"
            data-testid="showAnswersCheckbox"
            style="font-size: 16px"
          />
        </div>
      </KPageContainer>

      <div class="question-list">
        <QTIItemEditor
          v-for="(item, idx) in items"
          :key="item.assessment_id"
          :item="item"
          :index="idx"
          :total="items.length"
          :mode="activeId === item.assessment_id ? 'edit' : 'view'"
          :showAnswers="showAnswers"
          data-testid="item"
          @close="closeItem"
        >
          <template #toolbarActions>
            <CollapsibleToolbar
              :actions="getToolbarActions(item, idx)"
              data-testid="toolbar"
            />
          </template>
        </QTIItemEditor>
      </div>
    </template>

    <div v-else>
      {{ noQuestionsPlaceholder$() }}
    </div>

    <KButton
      :text="newQuestionBtnLabel$()"
      style="margin-top: 16px; margin-left: 0"
      data-testid="newQuestionBtn"
      @click="addItem()"
    />
  </div>

</template>


<script>

  import { v4 as uuidv4 } from 'uuid';
  import { ref, computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { qtiEditorStrings } from './qtiEditorStrings';
  import { AssessmentItemTypes } from './constants';
  import QTIItemEditor from './components/QTIItemEditor/index';
  import CollapsibleToolbar from './components/CollapsibleToolbar/index.vue';
  import useQTIEditorActions from './useQTIEditorActions';

  // Custom uuid4 function to match our dashless uuids on the server side
  function uuid4() {
    return uuidv4().replace(/-/g, '');
  }

  /** Creates a blank item with a stable UUID and the default interaction type. */
  function createBlankItem() {
    return {
      assessment_id: uuid4(),
      type: AssessmentItemTypes.QTI,
    };
  }

  export default {
    name: 'QTIEditor',

    components: { QTIItemEditor, CollapsibleToolbar },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();

      const containerStyle = computed(() => ({
        maxWidth: '1200px',
        margin: '0 auto',
        padding: windowIsSmall.value ? '16px' : '32px',
      }));

      const items = computed(() => props.assessments);

      const activeId = ref(null);
      const showAnswers = ref(false);

      function openItem(id) {
        activeId.value = id;
      }

      function closeItem() {
        activeId.value = null;
      }

      /**
       * Add a blank item.
       * @param {Object} [opts]
       * @param {number} [opts.atIndex] splice position; defaults to end of list
       */
      function addItem({ atIndex } = {}) {
        const newItem = createBlankItem();
        const list = [...props.assessments];
        const pos = atIndex !== undefined ? atIndex : list.length;
        list.splice(pos, 0, newItem);
        emit('update', list);
        activeId.value = newItem.assessment_id;
      }

      function deleteItem(item) {
        if (activeId.value === item.assessment_id) closeItem();
        emit(
          'update',
          props.assessments.filter(i => i.assessment_id !== item.assessment_id),
        );
      }

      function moveItemUp(idx) {
        if (idx === 0) return;
        const list = [...props.assessments];
        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
        emit('update', list);
      }

      function moveItemDown(idx) {
        if (idx === props.assessments.length - 1) return;
        const list = [...props.assessments];
        [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
        emit('update', list);
      }

      const { getToolbarActions } = useQTIEditorActions({
        items,
        activeId,
        windowIsSmall,
        openItem,
        moveItemUp,
        moveItemDown,
        addItem,
        deleteItem,
      });

      const { noQuestionsPlaceholder$, newQuestionBtnLabel$, showAnswers$ } = qtiEditorStrings;

      return {
        containerStyle,
        items,
        activeId,
        showAnswers,
        closeItem,
        addItem,
        getToolbarActions,
        noQuestionsPlaceholder$,
        newQuestionBtnLabel$,
        showAnswers$,
      };
    },

    props: {
      /**
       * Ordered list of assessment items. Each item must have:
       *   assessment_id {String}  — stable unique identifier (UUID)
       *   type          {String}  — e.g., AssessmentItemTypes.QTI
       *   raw_data      {String}  — optional, full QTI XML string
       *
       * Array index is the display order.
       * This component never mutates the prop — it emits `update` with the new list.
       */
      assessments: {
        type: Array,
        default: () => [],
      },
    },

    emits: ['update'],
  };

</script>


<style lang="scss" scoped>

  .show-answers-container {
    margin-bottom: 16px;
  }

  .show-answers-inner {
    display: flex;
    align-items: center;
    padding: 12px;
  }

  .question-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

</style>
