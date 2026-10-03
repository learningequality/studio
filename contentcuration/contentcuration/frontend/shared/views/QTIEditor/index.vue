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
          :allowFreeResponse="allowFreeResponse"
          :language="language"
          :showAnswers="showAnswers"
          data-testid="item"
          @open="openItem(item.assessment_id)"
          @close="closeItem"
          @update:rawData="newXml => updateItemRawData(item.assessment_id, newXml)"
        >
          <template #toolbarActions="{ canOpen }">
            <CollapsibleToolbar
              :ref="el => setToolbarRef(item.assessment_id, el)"
              :actions="getToolbarActions(item, idx, { canOpen })"
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
  import { ref, computed, nextTick } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { qtiEditorStrings } from './qtiEditorStrings';
  import { AssessmentItemTypes } from './constants';
  import QTIItemEditor from './components/QTIItemEditor/index';
  import CollapsibleToolbar from './components/CollapsibleToolbar/index.vue';
  import useQTIEditorActions from './useQTIEditorActions';
  import { createBlankItemXml } from './serialization/createBlankItem';

  // Custom uuid4 function to match our dashless uuids on the server side
  function uuid4() {
    return uuidv4().replace(/-/g, '');
  }

  /** Creates a blank item with a stable UUID and the default interaction type. */
  function createBlankItem() {
    return {
      assessment_id: uuid4(),
      type: AssessmentItemTypes.QTI,
      raw_data: createBlankItemXml(),
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

      const toolbars = {};

      function setToolbarRef(id, toolbar) {
        if (toolbar) {
          toolbars[id] = toolbar;
        } else {
          delete toolbars[id];
        }
      }

      function closeItem() {
        const closedId = activeId.value;
        activeId.value = null;
        // The Close button goes with the card, so hand focus to the Edit action that reopens
        // it. On the next tick, because closing is what enables that action.
        nextTick(() => toolbars[closedId]?.focusAction('edit'));
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

      /**
       * Patch a single item's raw_data in the assessments list.
       * Called whenever an interaction editor emits updated XML.
       */
      function updateItemRawData(assessmentId, newRawData) {
        const list = props.assessments.map(item =>
          item.assessment_id === assessmentId ? { ...item, raw_data: newRawData } : item,
        );
        emit('update', list);
      }

      const { getToolbarActions } = useQTIEditorActions({
        items,
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
        setToolbarRef,
        openItem,
        closeItem,
        addItem,
        updateItemRawData,
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
      /**
       * Whether a question with no correct answer counts as complete. Only a survey
       * accepts those, so a consumer that scores its questions passes false.
       */
      allowFreeResponse: {
        type: Boolean,
        default: true,
      },
      /**
       * The exercise's language, which numeric answers are read and shown in. Empty means
       * they are read and shown as stored.
       */
      language: {
        type: String,
        default: '',
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
