<template>

  <div :style="[containerStyle, { padding: '16px' }]">
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
      >
        <QTIItemEditor
          v-for="(item, idx) in items"
          :key="item.id"
          :item="item"
          :index="idx + 1"
          :total="items.length"
          :isOpen="activeId === item.id"
          :displayAnswersPreview="displayAnswersPreview"
          data-test="item"
          @open="openItem(item.id)"
          @close="closeItem"
          @action="onItemAction($event, item, idx)"
        />
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
  import { useQTIStr } from './qtiEditorStrings';
  import { QtiInteraction } from './constants';
  import QTIItemEditor from './components/QTIItemEditor/index';
  import Checkbox from 'shared/views/form/Checkbox';
  import { AssessmentItemToolbarActions } from 'frontend/channelEdit/constants';

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

    components: { QTIItemEditor, Checkbox },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();

      const containerStyle = computed(() =>
        windowIsSmall.value ? {} : { maxWidth: '85%', margin: '0 auto' },
      );

      const items = computed(() => props.assessments);

      const activeId = ref(null);
      const displayAnswersPreview = ref(false);

      function openItem(id) {
        activeId.value = id;
      }

      function closeItem() {
        activeId.value = null;
      }

      const cloneList = () => [...props.assessments];

      /**
       * Add a blank item.
       * @param {Object} [opts]
       * @param {number} [opts.atIndex] splice position; defaults to end of list
       */
      function addItem({ atIndex } = {}) {
        const newItem = createBlankItem();
        const list = cloneList();
        const pos = atIndex !== undefined ? atIndex : list.length;
        list.splice(pos, 0, newItem);
        emit('update', list);
        // Open the newly created card on the next tick
        setTimeout(() => {
          activeId.value = newItem.id;
        }, 0);
      }

      function deleteItem(item) {
        if (activeId.value === item.id) closeItem();
        emit(
          'update',
          cloneList().filter(i => i.id !== item.id),
        );
      }

      function moveItemUp(idx) {
        if (idx === 0) return;
        const list = cloneList();
        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
        emit('update', list);
      }

      function moveItemDown(idx) {
        if (idx === props.assessments.length - 1) return;
        const list = cloneList();
        [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
        emit('update', list);
      }

      function onItemAction(action, item, idx) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            openItem(item.id);
            break;
          case AssessmentItemToolbarActions.DELETE_ITEM:
            deleteItem(item);
            break;
          case AssessmentItemToolbarActions.ADD_ITEM_ABOVE:
            addItem({ atIndex: idx });
            break;
          case AssessmentItemToolbarActions.ADD_ITEM_BELOW:
            addItem({ atIndex: idx + 1 });
            break;
          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            moveItemUp(idx);
            break;
          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            moveItemDown(idx);
            break;
        }
      }

      return {
        noQuestionsPlaceholder: useQTIStr('noQuestionsPlaceholder'),
        newQuestionBtnLabel: useQTIStr('newQuestionBtnLabel'),
        showAnswersLabel: useQTIStr('showAnswers'),
        containerStyle,
        items,
        activeId,
        displayAnswersPreview,
        openItem,
        closeItem,
        addItem,
        onItemAction,
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

</style>
