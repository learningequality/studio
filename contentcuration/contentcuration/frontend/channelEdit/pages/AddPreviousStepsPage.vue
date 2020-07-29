<template>

  <AddRelatedResourcesModal
    :nodeId="nodeId"
    :toolbarTitle="$tr('toolbarTitle')"
    :selectedAsPreviousStepTooltip="$tr('selectedAsPreviousStep')"
    :selectedAsNextStepTooltip="$tr('selectedAsNextStep')"
    @addStep="onAddStepClick"
    @cancel="onCancelClick"
  />

</template>

<script>

  import { mapActions } from 'vuex';

  import { RouterNames, TabNames } from '../constants';
  import AddRelatedResourcesModal from '../components/AddRelatedResourcesModal';

  export default {
    name: 'AddPreviousStepsPage',
    components: {
      AddRelatedResourcesModal,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('contentNode', ['addPreviousStepToNode']),
      onAddStepClick(nodeId) {
        this.addPreviousStepToNode({
          targetId: this.nodeId,
          previousStepId: nodeId,
        });
      },
      onCancelClick() {
        let routeName = RouterNames.CONTENTNODE_DETAILS;
        if (this.$route.query && this.$route.query.back) {
          routeName = this.$route.query.back;
        }

        this.$router.push({
          name: routeName,
          params: {
            detailNodeIds: this.nodeId,
            tab: TabNames.RELATED,
          },
        });
      },
    },
    $trs: {
      toolbarTitle: 'Add previous step',
      selectedAsPreviousStep: 'Already selected as a previous step',
      selectedAsNextStep: 'Cannot select resources that are next steps for the current resource',
    },
  };

</script>
