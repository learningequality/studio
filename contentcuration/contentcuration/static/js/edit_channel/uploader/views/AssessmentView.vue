<template>
  <VContainer>
    <VExpansionPanel
      v-if="orderedAssessmentItems.length"
      v-model="openItemIdx"
      popout
    >
      <AssessmentItem
        v-for="(item, idx) in orderedAssessmentItems"
        :key="idx"
        :item="item"
        :itemIdx="idx"
        :isOpen="idx === openItemIdx"
        @update="updateItem"
        @close="closeItem"
      />
    </VExpansionPanel>

    <div v-else>
      No questions yet
    </div>

    <VBtn color="primary">
      New question
    </VBtn>
  </VContainer>
</template>

<script>

  import { mapState, mapGetters } from 'vuex';

  import AssessmentItem from '../components/AssessmentItem/AssessmentItem.vue';

  export default {
    name: 'AssessmentView',
    components: {
      AssessmentItem,
    },
    data() {
      return {
        openItemIdx: null,
      };
    },
    computed: {
      ...mapState('edit_modal', ['selectedIndices']),
      ...mapGetters('edit_modal', ['getNode']),
      assessmentItems() {
        // assessment view is accessible only when exactly one exercise item selected
        const nodeIndex = this.selectedIndices[0];

        return this.getNode(nodeIndex).assessment_items;
      },
      orderedAssessmentItems() {
        if (!this.assessmentItems || !this.assessmentItems.length) {
          return [];
        }

        const assessmentItems = [...this.assessmentItems];
        return assessmentItems.sort((item1, item2) => item1.order > item2.order);
      },
    },
    methods: {
      closeItem() {
        this.openItemIdx = null;
      },
      updateItem(payload) {
        alert(payload);
      },
    },
  };

</script>
