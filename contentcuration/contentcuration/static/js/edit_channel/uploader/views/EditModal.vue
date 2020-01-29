<template>

  <VDialog
    ref="editmodal"
    :value="$route.params.detailNodeId == detailNodeId"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
    lazy
    scrollable
  >
    <VCard class="edit-modal-wrapper">
      <VNavigationDrawer
        v-if="multipleNodes"
        v-model="drawerOpen"
        stateless
        clipped
        app
        class="edit-list"
      >
        <EditList v-model="selected" :nodeIds="detailNodeIds" />
      </VNavigationDrawer>
      <VToolbar dark color="primary" fixed clipped-left app>
        <VBtn ref="closebutton" icon dark app @click="closeModal">
          <VIcon>close</VIcon>
        </VBtn>
        <VToolbarTitle>{{ modalTitle }}</VToolbarTitle>
      </VToolbar>
      <VCardText>
        <template v-if="loadError">
          <VIcon color="red" class="error-icon">
            error
          </VIcon>
          <p>{{ $tr('loadErrorText') }}</p>
        </template>
        <EditView v-else :nodeIds="detailNodeIds" />
      </VCardText>
    </VCard>
  </VDialog>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';
  import { RouterNames } from 'frontend/channelEdit/constants';

  export default {
    name: 'EditModal',
    components: {
      EditList,
      EditView,
    },
    props: {
      detailNodeId: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        loadError: false,
        selected: this.detailNodeIds,
        drawerOpen: this.multipleNodes,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeIsValid']),
      ...mapGetters('currentChannel', ['canEdit']),
      isViewOnly() {
        return !this.canEdit;
      },
      multipleNodes() {
        // Only hide drawer when editing a single item
        return this.nodes.length > 1;
      },
      detailNodeIds() {
        if (this.detailNodeId) {
          return [this.detailNodeId];
        }
        return [];
      },
      nodes() {
        return this.detailNodeIds.map(detailNodeId => this.getContentNode(detailNodeId));
      },
      invalidNodeCount() {
        return this.detailNodeIds.reduce(
          (invalid, detailNodeId) => invalid + Number(!this.getContentNodeIsValid(detailNodeId)),
          0
        );
      },
      modalTitle() {
        return this.$tr(modes.EDIT);
      },
    },
    beforeRouteEnter(to, from, next) {
      if (to.name === RouterNames.CONTENTNODE_DETAILS) {
        return next(vm => {
          vm.loadContentNode(to.params.detailNodeId).catch(() => {
            vm.loadError = true;
          });
        });
      } else if (to.name === RouterNames.MULTI_CONTENTNODE_DETAILS) {
        return next(vm => {
          vm.loadContentNode(to.params.detailNodeIds.split(',')).catch(() => {
            vm.loadError = true;
          });
        });
      }
      return next(false);
    },
    methods: {
      ...mapActions('contentNode', ['loadContentNode']),
      closeModal() {
        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: { nodeId: this.$route.params.nodeId },
        });
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      [modes.EDIT]: 'Editing Content Details',
      [modes.VIEW_ONLY]: 'Viewing Content Details',
      [modes.NEW_TOPIC]: 'Adding Topics',
      [modes.NEW_EXERCISE]: 'Adding Exercises',
      [modes.UPLOAD]: 'Uploading Files',
      /* eslint-enable */
      savingIndicator: 'Saving...',
      unsavedChanges: 'Save your changes?',
      unsavedChangesText: "Your changes will be lost if you don't save them",
      dontSaveButton: "Don't save",
      cancelButton: 'Cancel',
      saveButton: 'Save changes',
      loadErrorText: 'Unable to load content',
      relatedContentHeader: 'Related content detected',
      relatedContentText: 'Related content will not be included in the copy of this content.',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      autosaveDisabledMessage:
        'Autosave paused ({count, plural,\n =1 {# error}\n other {# errors}} detected)',
      topicDefaultTitle: '{parent} Topic',
      exerciseDefaultTitle: '{parent} Exercise',
    },
  };

</script>

<style lang="less" scoped>

  .last-saved-time {
    padding-top: 20px;
    margin-right: 15px;
    font-style: italic;
    .v-progress-circular {
      margin-right: 10px;
      vertical-align: text-top;
    }

    // there is a conflicting style for .row class in common styles
    // that sets left and right margin to -15px which breaks Vuetify
    // elements using Vuetify's .row class
    .row {
      margin-right: 0;
      margin-left: 0;
    }
  }

</style>
