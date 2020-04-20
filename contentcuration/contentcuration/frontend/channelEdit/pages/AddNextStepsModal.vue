<template>

  <AddRelatedResourcesModal
    :targetNodeId="targetNodeId"
    :toolbarTitle="$tr('toolbarTitle')"
    :selectedAsPreviousStepTooltip="$tr('selectedAsPreviousStep')"
    :selectedAsNextStepTooltip="$tr('selectedAsNextStep')"
    @addStep="onAddStepClick"
  />

</template>

<script>

  import { mapActions } from 'vuex';

  import AddRelatedResourcesModal from '../components/AddRelatedResourcesModal';

  export default {
    name: 'AddNextStepsModal',
    components: {
      AddRelatedResourcesModal,
    },
    props: {
      targetNodeId: {
        type: String,
        required: true,
      },
    },
    created() {
      this.loadRelatedResources(this.targetNodeId);
    },
    methods: {
      ...mapActions('contentNode', ['addNextStepToNode', 'loadRelatedResources']),
      onAddStepClick(nodeId) {
        this.addNextStepToNode({
          targetId: this.targetNodeId,
          nextStepId: nodeId,
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
