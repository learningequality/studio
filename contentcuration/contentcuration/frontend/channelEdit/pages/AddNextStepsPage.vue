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
    name: 'AddNextStepsPage',
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
      ...mapActions('contentNode', ['addNextStepToNode']),
      onAddStepClick(nodeId) {
        this.addNextStepToNode({
          targetId: this.nodeId,
          nextStepId: nodeId,
        });
      },
      onCancelClick() {
        let routeName = RouterNames.CONTENTNODE_DETAILS;
        if (this.$route.query && this.$route.query.last) {
          routeName = this.$route.query.last;
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
      toolbarTitle: 'Add next step',
      selectedAsPreviousStep:
        'Cannot select resources that are previous steps for the current resource',
      selectedAsNextStep: 'Already selected as a next step',
    },
  };

</script>
