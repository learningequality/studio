<template>

  <AddRelatedResourcesModal
    :nodeId="targetNodeId"
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
      targetNodeId: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('contentNode', ['addNextStepToNode']),
      onAddStepClick(nodeId) {
        this.addNextStepToNode({
          targetId: this.targetNodeId,
          nextStepId: nodeId,
        }).then(() => {
          this.onCancelClick();
          this.$store.dispatch('showSnackbarSimple', this.$tr('addedNextStepSnackbar'));
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
            ...this.$route.params,
            tab: TabNames.RELATED,
          },
        });
      },
    },
    $trs: {
      toolbarTitle: 'Add next step',
      selectedAsPreviousStep: "This resource is already selected for 'previous steps'",
      selectedAsNextStep: 'Already selected as a next step',
      addedNextStepSnackbar: 'Added next step',
    },
  };

</script>
