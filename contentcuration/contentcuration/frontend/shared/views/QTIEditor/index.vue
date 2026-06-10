<template>

  <div :style="containerStyle">
    <template v-if="items && items.length">
      <KPageContainer
        class="show-answers-container"
        :topMargin="0"
        noPadding
      >
        <div class="show-answers-inner">
          <Checkbox
            v-model="displayAnswersPreview"
            :label="showAnswersLabel"
            class="ma-0"
            data-test="showAnswersCheckbox"
            style="font-size: 16px"
          />
        </div>
      </KPageContainer>

      <transition-group
        name="list-complete"
        tag="div"
        class="question-list"
      >
        <QTIItemEditor
          v-for="(item, idx) in items"
          :key="item.id"
          :item="item"
          :index="idx + 1"
          :total="items.length"
          :mode="activeId === item.id ? 'edit' : 'view'"
          :displayAnswersPreview="displayAnswersPreview"
          data-test="item"
          @close="closeItem"
        >
          <template #toolbarActions>
            <CollapsibleToolbar
              :actions="getToolbarActions(item, idx)"
              :optionsLabel="optionsLabel"
              data-test="toolbar"
            />
          </template>
        </QTIItemEditor>
      </transition-group>
    </template>

    <div v-else>
      {{ noQuestionsPlaceholder }}
    </div>

    <KButton
      :text="newQuestionBtnLabel"
      style="margin-top: 16px; margin-left: 0"
      data-test="newQuestionBtn"
      @click="addItem()"
    />
  </div>

</template>


<script>

  import { ref, computed, defineComponent } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { qtiEditorStrings } from './qtiEditorStrings';
  import { QtiInteraction } from './constants';
  import QTIItemEditor from './components/QTIItemEditor/index';
  import CollapsibleToolbar from './components/CollapsibleToolbar/index.vue';
  import useQTIEditorActions from './useQTIEditorActions';
  import Checkbox from 'shared/views/form/Checkbox';

  /** Creates a blank item with a stable UUID and the default interaction type. */
  function createBlankItem() {
    return {
      id: uuidv4(),
      type: QtiInteraction.CHOICE,
      title: '',
    };
  }

  export default defineComponent({
    name: 'QTIEditor',

    components: { QTIItemEditor, CollapsibleToolbar, Checkbox },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();

      const containerStyle = computed(() => ({
        maxWidth: '1200px',
        margin: '0 auto',
        padding: windowIsSmall.value ? '16px' : '32px',
      }));

      const items = computed(() => props.assessments);

      const activeId = ref(null);
      const displayAnswersPreview = ref(false);

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
        // open the newly created card
        activeId.value = newItem.id;
      }

      function deleteItem(item) {
        if (activeId.value === item.id) closeItem();
        emit(
          'update',
          props.assessments.filter(i => i.id !== item.id),
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

      const { noQuestionsPlaceholder$, newQuestionBtnLabel$, showAnswers$, options$ } =
        qtiEditorStrings;

      return {
        noQuestionsPlaceholder: noQuestionsPlaceholder$(),
        newQuestionBtnLabel: newQuestionBtnLabel$(),
        showAnswersLabel: showAnswers$(),
        containerStyle,
        items,
        activeId,
        displayAnswersPreview,
        closeItem,
        addItem,
        getToolbarActions,
        optionsLabel: options$(),
      };
    },

    props: {
      /**
       * Ordered list of assessment items. Each item must have:
       *   id    {String}  — stable unique identifier (UUID)
       *   type  {String}  — a QtiInteraction value
       *   title {String}  — optional display title
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
  });

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

  /* Transition Group Animations */
  .list-complete-enter-active,
  .list-complete-leave-active {
    transition: all 0.3s ease;
  }

  .list-complete-enter,
  .list-complete-leave-to {
    opacity: 0;
    transform: translateY(16px);
  }

  .list-complete-move {
    transition: transform 0.3s ease;
  }

  .question-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

</style>
