<template>
  <VContainer>
    <VCheckbox
      v-model="displayAnswersPreview"
      label="Show answers"
      data-test="showAnswersCheckbox"
    />

    <template v-if="assessmentItems && assessmentItems.length">
      <AssessmentItem
        v-for="(item, idx) in assessmentItems"
        :key="idx"
        :item="item"
        :itemIdx="idx"
        :isOpen="idx === openItemIdx"
        :displayAnswersPreview="displayAnswersPreview"
        :isFirst="idx === 0"
        :isLast="idx === assessmentItems.length-1"
        @update="updateItem"
        @close="closeItem"
        @toolbarClick="onToolbarClick($event, idx)"
      />
    </template>

    <div v-else>
      No questions yet
    </div>

    <VBtn
      color="primary"
      data-test="newQuestionBtn"
      @click="addNewItem"
    >
      New question
    </VBtn>
  </VContainer>
</template>

<script>

  import { mapState, mapGetters, mapMutations } from 'vuex';

  import { AssessmentItemToolbarActions } from '../constants';
  import AssessmentItem from '../components/AssessmentItem/AssessmentItem.vue';

  export default {
    name: 'AssessmentView',
    components: {
      AssessmentItem,
    },
    data() {
      return {
        openItemIdx: null,
        displayAnswersPreview: false,
      };
    },
    computed: {
      ...mapState('edit_modal', ['selectedIndices']),
      ...mapGetters('edit_modal', ['getNode', 'nodeAssessmentDraft']),
      // assessment view is accessible only when exactly one exercise node is selected
      nodeIndex() {
        return this.selectedIndices[0];
      },
      node() {
        return this.getNode(this.nodeIndex);
      },
      nodeId() {
        return this.node.id;
      },
      assessmentItems() {
        return this.nodeAssessmentDraft(this.nodeId);
      },
    },
    watch: {
      selectedIndices() {
        this.closeItem();
      },
    },
    created() {
      if (this.nodeAssessmentDraft(this.nodeId) !== null) {
        return;
      }

      this.addNodeAssessmentDraft({
        nodeId: this.nodeId,
        assessmentItems: this.node.assessment_items,
      });
    },
    methods: {
      ...mapMutations('edit_modal', [
        'addNodeAssessmentDraft',
        'addNodeAssessmentDraftItem',
        'updateNodeAssessmentDraftItem',
      ]),
      onToolbarClick(action, itemIdx) {
        if (action === AssessmentItemToolbarActions.EDIT_ITEM) {
          this.openItem(itemIdx);
        }
      },
      openItem(itemIdx) {
        this.openItemIdx = itemIdx;
      },
      closeItem() {
        this.openItemIdx = null;
      },
      updateItem({ itemIdx, payload }) {
        this.updateNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: itemIdx,
          data: payload,
        });
      },
      addNewItem() {
        this.addNodeAssessmentDraftItem(this.nodeId);
        this.openItemIdx = this.assessmentItems.length - 1;
      },
    },
  };

</script>
