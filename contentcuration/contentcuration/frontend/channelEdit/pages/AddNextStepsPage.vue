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
  import { RouteNames, TabNames } from '../constants';
  import AddRelatedResourcesModal from '../components/AddRelatedResourcesModal';
  import { routerMixin, titleMixin } from 'shared/mixins';

  export default {
    name: 'AddNextStepsPage',
    components: {
      AddRelatedResourcesModal,
    },
    mixins: [routerMixin, titleMixin],
    props: {
      targetNodeId: {
        type: String,
        required: true,
      },
    },
    mounted() {
      this.updateTitleForPage();
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
        let routeName = RouteNames.CONTENTNODE_DETAILS;
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
      updateTitleForPage() {
        let title = this.$tr('toolbarTitle');
        const node = this.$store.getters['contentNode/getContentNode'](this.targetNodeId);
        if (node) {
          title = title + ` - ${this.getTitle(node)}`;
        }
        this.updateTabTitle(this.$store.getters.appendChannelName(title));
      },
    },
    $trs: {
      toolbarTitle: 'Add next step',
      addedNextStepSnackbar: 'Added next step',
    },
  };

</script>
