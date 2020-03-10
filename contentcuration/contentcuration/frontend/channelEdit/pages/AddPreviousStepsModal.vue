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
    name: 'AddPreviousStepsModal',
    components: {
      AddRelatedResourcesModal,
    },
    props: {
      targetNodeId: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('contentNode', ['addPreviousStepToNode']),
      onAddStepClick(node) {
        this.addPreviousStepToNode({
          targetId: this.targetNodeId,
          previousStepId: node.id,
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
