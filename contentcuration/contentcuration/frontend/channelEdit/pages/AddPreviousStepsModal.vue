<template>

  <AddRelatedResourcesModal
    :targetNodeId="targetNodeId"
    :toolbarTitle="$tr('toolbarTitle')"
    :selectedAsPreviousStepTooltip="$tr('selectedAsPreviousStep')"
    :selectedAsNextStepTooltip="$tr('selectedAsNextStep')"
    @addStep="onAddStepClick"
    @cancel="onCancelClick"
  />

</template>

<script>

  import { mapActions } from 'vuex';

  import { RouterNames } from '../constants';
  import AddRelatedResourcesModal from '../components/AddRelatedResourcesModal';
  import { TabNames } from 'edit_channel/uploader/constants';

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
    created() {
      this.loadRelatedResources(this.targetNodeId);
    },
    methods: {
      ...mapActions('contentNode', ['addPreviousStepToNode', 'loadRelatedResources']),
      onAddStepClick(nodeId) {
        this.addPreviousStepToNode({
          targetId: this.targetNodeId,
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
            detailNodeIds: this.targetNodeId,
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
