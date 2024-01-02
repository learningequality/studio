<template>

  <div
    style="max-height: 80vh"
  >
    <VList>
      <template
        v-for="(group, groupIndex) in groupedOptions"
      >
        <VListTile
          v-for="(option, index) in group"
          :key="groupIndex + '-' + index"
          ripple
          :to="option.to"
          @click="option.onClick($event)"
        >
          <VListTileTitle>
            {{ option.label }}
          </VListTileTitle>
        </VListTile>
        <VDivider
          v-if="groupIndex < groupedOptions.length - 1"
          :key="groupIndex + '-divider'"
          class="divider"
        />
      </template>
    </VList>

    <MoveModal
      v-if="moveModalOpen"
      ref="moveModal"
      v-model="moveModalOpen"
      :moveNodeIds="[nodeId]"
      @target="moveNode"
    />
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouteNames, TabNames, QuickEditModals } from '../constants';
  import MoveModal from './move/MoveModal';
  import { ContentNode } from 'shared/data/resources';
  import { withChangeTracker } from 'shared/data/changes';
  import { RELATIVE_TREE_POSITIONS } from 'shared/data/constants';

  export default {
    name: 'ContentNodeOptions',
    components: {
      MoveModal,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      hideDetailsLink: {
        type: Boolean,
        default: false,
      },
      hideEditLink: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        moveModalOpen: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'trashId']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeDescendants']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      isTopic() {
        return this.node.kind === 'topic';
      },
      /**
       * Returns a list of options to display in the menu
       * @returns {Array<Array<Object>>} List of lists, where each inner list is a group of options
       *                                 already filtered by the render condition
       */
      groupedOptions() {
        const options = [
          [
            {
              label: this.$tr('viewDetails'),
              to: this.viewLink,
              onClick: () => this.trackAction('View'),
              condition: !this.hideDetailsLink,
            },
            {
              label: this.$tr('editTitleDescription'),
              onClick: this.editTitleDescription,
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editAllDetails'),
              to: this.editLink,
              onClick: () => this.trackAction('Edit'),
              condition: this.canEdit && !this.hideEditLink,
            },
            {
              label: this.$tr('move'),
              onClick: $event => {
                $event.stopPropagation();
                this.moveModalOpen = true;
              },
              condition: this.canEdit,
            },
            {
              label: this.$tr('copyToClipboard'),
              onClick: this.copyToClipboard,
              condition: true,
            },
            {
              label: this.$tr('makeACopy'),
              onClick: this.duplicateNode,
              condition: this.canEdit,
            },
            {
              label: this.$tr('newSubtopic'),
              onClick: this.newTopicNode,
              condition: this.canEdit && this.isTopic,
            },
            {
              label: this.$tr('remove'),
              onClick: this.removeNode,
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editTags'),
              onClick: this.editTags,
              condition: this.canEdit,
            },
            {
              label: this.$tr('editLanguage'),
              onClick: this.editLanguage,
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editCategories'),
              onClick: this.editCategories,
              condition: this.canEdit,
            },
            {
              label: this.$tr('editLevels'),
              onClick: this.editLevels,
              condition: this.canEdit,
            },
            {
              label: this.$tr('editLearningActivities'),
              onClick: this.editLearningActivities,
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editSource'),
              onClick: this.editSource,
              condition: this.canEdit,
            },
            {
              label: this.$tr('editAudience'),
              onClick: this.editAudience,
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editCompletion'),
              onClick: this.editCompletion,
              condition: this.canEdit,
            },
            {
              label: this.$tr('editWhatIsNeeded'),
              onClick: this.editWhatIsNeeded,
              condition: this.canEdit,
            },
          ],
        ];

        return options
          .filter(group => group.some(option => option.condition))
          .map(group => group.filter(option => option.condition));
      },
      editLink() {
        return {
          name: RouteNames.CONTENTNODE_DETAILS,
          params: {
            ...this.$route.params,
            detailNodeIds: this.nodeId,
          },
        };
      },
      viewLink() {
        return {
          name: RouteNames.TREE_VIEW,
          params: {
            ...this.$route.params,
            detailNodeId: this.nodeId,
          },
        };
      },
    },
    watch: {
      moveModalOpen(open) {
        if (open) {
          this.trackAction('Move');
        }
      },
    },
    methods: {
      ...mapMutations('contentNode', {
        openQuickEditModal: 'SET_QUICK_EDIT_MODAL_OPEN',
      }),
      ...mapActions(['showSnackbar']),
      ...mapActions('contentNode', ['createContentNode', 'moveContentNodes', 'copyContentNode']),
      ...mapActions('clipboard', ['copy']),
      newTopicNode() {
        this.trackAction('New topic');
        const nodeData = {
          parent: this.nodeId,
          kind: 'topic',
        };
        this.createContentNode(nodeData).then(newId => {
          this.$router.push({
            name: RouteNames.ADD_TOPICS,
            params: {
              ...this.$route.params,
              detailNodeIds: newId,
              tab: TabNames.DETAILS,
            },
          });
        });
      },
      moveNode(target) {
        return this.moveContentNodes({ id__in: [this.nodeId], parent: target }).then(
          this.$refs.moveModal.moveComplete
        );
      },
      getRemoveNodeRedirect() {
        // Returns a callback to do appropriate post-removal navigation
        const { detailNodeId, nodeId } = this.$route.params;

        // If the NodePanel for one of the deleted nodes is open, close it
        if (detailNodeId === this.nodeId) {
          return () => this.$router.replace({ params: { detailNodeId: null } });
        }

        // If current topic or one of its ancestors is deleted, go to the parent
        // of the deleted topic
        if (
          nodeId === this.nodeId ||
          this.getContentNodeDescendants(this.nodeId).find(({ id }) => id === nodeId)
        ) {
          const parentId = this.getContentNode(this.nodeId).parent;
          return () => this.$router.replace({ params: { nodeId: parentId } });
        }

        // Otherwise, don't do anything
        return () => {};
      },
      editTitleDescription() {
        this.trackAction('Edit title and description');
        this.openQuickEditModal({
          modal: QuickEditModals.TITLE_DESCRIPTION,
          nodeIds: [this.nodeId],
        });
      },
      editTags() {
        this.trackAction('Edit tags');
        this.openQuickEditModal({
          modal: QuickEditModals.TAGS,
          nodeIds: [this.nodeId],
        });
      },
      editLanguage() {
        this.trackAction('Edit language');
        this.openQuickEditModal({
          modal: QuickEditModals.LANGUAGE,
          nodeIds: [this.nodeId],
        });
      },
      editCategories() {
        this.trackAction('Edit categories');
        this.openQuickEditModal({
          modal: QuickEditModals.CATEGORIES,
          nodeIds: [this.nodeId],
        });
      },
      editLevels() {
        this.trackAction('Edit levels');
        this.openQuickEditModal({
          modal: QuickEditModals.LEVELS,
          nodeIds: [this.nodeId],
        });
      },
      editLearningActivities() {
        this.trackAction('Edit learning activities');
        this.openQuickEditModal({
          modal: QuickEditModals.LEARNING_ACTIVITIES,
          nodeIds: [this.nodeId],
        });
      },
      editSource() {
        this.trackAction('Edit source');
        this.openQuickEditModal({
          modal: QuickEditModals.SOURCE,
          nodeIds: [this.nodeId],
        });
      },
      editAudience() {
        this.trackAction('Edit audience');
        this.openQuickEditModal({
          modal: QuickEditModals.AUDIENCE,
          nodeIds: [this.nodeId],
        });
      },
      editCompletion() {
        this.trackAction('Edit completion');
        this.openQuickEditModal({
          modal: QuickEditModals.COMPLETION,
          nodeIds: [this.nodeId],
        });
      },
      editWhatIsNeeded() {
        this.trackAction('Edit what is needed');
        this.openQuickEditModal({
          modal: QuickEditModals.WHAT_IS_NEEDED,
          nodeIds: [this.nodeId],
        });
      },
      removeNode: withChangeTracker(function(changeTracker) {
        this.trackAction('Delete');
        const redirect = this.getRemoveNodeRedirect();
        return this.moveContentNodes({ id__in: [this.nodeId], parent: this.trashId }).then(() => {
          redirect();
          this.showSnackbar({
            text: this.$tr('removedItems'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      copyToClipboard: withChangeTracker(function(changeTracker) {
        this.trackAction('Copy to clipboard');

        return this.copy({ node_id: this.node.node_id, channel_id: this.node.channel_id }).then(
          () => {
            this.showSnackbar({
              text: this.$tr('copiedToClipboardSnackbar'),
              // TODO: implement revert functionality for clipboard
              // actionText: this.$tr('undo'),
              // actionCallback: () => changeTracker.revert(),
            }).then(() => changeTracker.cleanUp());
          }
        );
      }),
      duplicateNode: withChangeTracker(function(changeTracker) {
        this.trackAction('Copy');
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          // TODO: determine how to cancel copying while it's in progress,
          // TODO: if that's something we want
          // actionText: this.$tr('cancel'),
          // actionCallback: () => changeTracker.revert(),
        });
        return this.copyContentNode({
          id: this.nodeId,
          target: this.nodeId,
          position: RELATIVE_TREE_POSITIONS.RIGHT,
        }).then(node => {
          ContentNode.waitForCopying([node.id]).then(() => {
            this.showSnackbar({
              text: this.$tr('copiedSnackbar'),
              actionText: this.$tr('undo'),
              actionCallback: () => changeTracker.revert(),
            }).then(() => changeTracker.cleanUp());
          });
        });
      }),
      trackAction(eventLabel) {
        this.$analytics.trackAction('channel_editor_node', 'Click', {
          eventLabel,
        });
      },
    },

    $trs: {
      newSubtopic: 'New folder',
      editTitleDescription: 'Edit title and description',
      editAllDetails: 'Edit all details',
      editTags: 'Edit tags',
      editLanguage: 'Edit language',
      editCategories: 'Edit categories',
      editLevels: 'Edit levels',
      editLearningActivities: 'Edit learning activities',
      editSource: 'Edit source',
      editAudience: 'Edit audience',
      editCompletion: 'Edit completion',
      editWhatIsNeeded: "Edit 'what is needed'",
      viewDetails: 'View details',
      move: 'Move',
      makeACopy: 'Make a copy',
      copyToClipboard: 'Copy to clipboard',
      remove: 'Remove',
      undo: 'Undo',
      creatingCopies: 'Copying...',
      copiedSnackbar: 'Copy operation complete',
      copiedToClipboardSnackbar: 'Copied to clipboard',
      removedItems: 'Sent to trash',
    },
  };

</script>

<style scoped>
  .divider {
    margin: 8px 0!important;
  }
</style>
