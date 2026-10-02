<template>

  <AddRelatedResourcesModal
    :nodeId="targetNodeId"
    :toolbarTitle="$tr('toolbarTitle')"
    @addStep="onAddStepClick"
    @cancel="onCancelClick"
  />

</template>


<script>

  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

  import { mapActions } from 'vuex';
  import { RouteNames, TabNames } from '../constants';
  import AddRelatedResourcesModal from '../components/AddRelatedResourcesModal';
  import { routerMixin, titleMixin } from 'shared/mixins';

  export default {
    name: 'AddPreviousStepsPage',
    components: {
      AddRelatedResourcesModal,
    },
    mixins: [routerMixin, titleMixin],
    setup() {
      const { createSnackbar } = useKSnackbar();
      return { createSnackbar };
    },
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
      ...mapActions('contentNode', ['addPreviousStepToNode']),
      onAddStepClick(nodeId) {
        this.addPreviousStepToNode({
          targetId: this.targetNodeId,
          previousStepId: nodeId,
        }).then(() => {
          this.onCancelClick();
          this.createSnackbar({
            text: this.$tr('addedPreviousStepSnackbar'),
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
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
      toolbarTitle: 'Add previous step',
      addedPreviousStepSnackbar: 'Added previous step',
    },
  };

</script>
