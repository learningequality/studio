<template>
  <div>
    <VCheckbox
      v-model="displayAnswersPreview"
      label="Show answers"
      data-test="showAnswersCheckbox"
    />

    <template v-if="assessmentItems && assessmentItems.length">
      <AssessmentItem
        v-for="(_, itemIdx) in assessmentItems"
        :key="itemIdx"
        :nodeId="nodeId"
        :itemIdx="itemIdx"
        :isOpen="itemIdx === openItemIdx"
        :displayAnswersPreview="displayAnswersPreview"
        @close="closeItem"
        @open="openItem(itemIdx)"
        @newItemAdded="onNewItemAdded"
        @itemsSwapped="onItemsSwapped"
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
  </div>
</template>

<script>

  import { mapState, mapGetters, mapMutations } from 'vuex';

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
      ...mapMutations('edit_modal', ['addNodeAssessmentDraft', 'addNodeAssessmentDraftItem']),
      addNewItem() {
        this.addNodeAssessmentDraftItem({ nodeId: this.nodeId });
        this.openItem(this.assessmentItems.length - 1);
      },
      openItem(itemIdx) {
        this.openItemIdx = itemIdx;
      },
      closeItem() {
        this.openItemIdx = null;
      },
      onNewItemAdded(itemIdx) {
        this.openItem(itemIdx);
      },
      onItemsSwapped({ firstItemIdx, secondItemIdx }) {
        if (this.openItemIdx === firstItemIdx) {
          this.openItemIdx = secondItemIdx;
          return;
        }

        if (this.openItemIdx === secondItemIdx) {
          this.openItemIdx = firstItemIdx;
          return;
        }
      },
    },
  };

</script>
