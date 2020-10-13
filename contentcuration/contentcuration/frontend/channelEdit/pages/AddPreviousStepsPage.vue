<template>

  <AddRelatedResourcesModal
    :nodeId="targetNodeId"
    :toolbarTitle="$tr('toolbarTitle')"
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
      targetNodeId: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('contentNode', ['addPreviousStepToNode']),
      onAddStepClick(nodeId) {
        this.addPreviousStepToNode({
          targetId: this.targetNodeId,
          previousStepId: nodeId,
        }).then(() => {
          this.onCancelClick();
          this.$store.dispatch('showSnackbarSimple', this.$tr('addedPreviousStepSnackbar'));
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
      toolbarTitle: 'Add previous step',
      addedPreviousStepSnackbar: 'Added previous step',
    },
  };

</script>
