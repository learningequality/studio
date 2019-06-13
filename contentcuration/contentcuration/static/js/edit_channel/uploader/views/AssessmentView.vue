<template>
  <VContainer>
    <VCheckbox
      v-model="displayAnswersPreview"
      label="Show answers"
      data-test="showAnswersCheckbox"
    />

    <VExpansionPanel
      v-if="assessmentItems && assessmentItems.length"
      v-model="openItemIdx"
      popout
    >
      <AssessmentItem
        v-for="(item, idx) in assessmentItems"
        :key="idx"
        :item="item"
        :itemIdx="idx"
        :isOpen="idx === openItemIdx"
        :displayAnswersPreview="displayAnswersPreview"
        @update="updateItem"
        @close="closeItem"
      />
    </VExpansionPanel>

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

      let assessmentItems = [];
      if (this.node.assessment_items && this.node.assessment_items.length) {
        assessmentItems = [...this.node.assessment_items].sort((item1, item2) =>
          item1.order > item2.order ? 1 : -1
        );
      }

      this.addNodeAssessmentDraft({ nodeId: this.nodeId, assessmentItems });
    },
    methods: {
      ...mapMutations('edit_modal', [
        'addNodeAssessmentDraft',
        'addNodeAssessmentDraftItem',
        'updateNodeAssessmentDraftItem',
      ]),
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
