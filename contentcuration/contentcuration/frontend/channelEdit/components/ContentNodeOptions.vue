<template>

  <div
    style="max-height: 80vh"
  >
    <VList ref="optionsList">
      <template
        v-for="(group, groupIndex) in groupedOptions"
      >
        <VListTile
          v-for="(option, index) in group"
          :key="groupIndex + '-' + index"
          class="options-list-item"
          ripple
          :to="option.to"
          tabindex="0"
          @click="option.onClick($event)"
          @keydown.enter="option.onClick($event)"
          @keydown.tab="checkTabBoundaries($event)"
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

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames, TabNames, QuickEditModals } from '../constants';
  import MoveModal from './move/MoveModal';
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
              onClick: this.quickEditModalFactory(QuickEditModals.TITLE_DESCRIPTION),
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
              onClick: () => this.duplicateNode(this.nodeId),
              condition: this.canEdit,
            },
            {
              label: this.$tr('newSubtopic'),
              onClick: this.newTopicNode,
              condition: this.canEdit && this.isTopic,
            },
            {
              label: this.$tr('remove'),
              onClick: () => this.removeNode([this.nodeId]),
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editTags'),
              onClick: this.quickEditModalFactory(QuickEditModals.TAGS),
              condition: this.canEdit && false,
            },
            {
              label: this.$tr('editLanguage'),
              onClick: this.quickEditModalFactory(QuickEditModals.LANGUAGE),
              condition: this.canEdit,
            },
          ],
          [
            {
              label: this.$tr('editCategories'),
              onClick: this.quickEditModalFactory(QuickEditModals.CATEGORIES),
              condition: this.canEdit,
            },
            {
              label: this.$tr('editLevels'),
              onClick: this.quickEditModalFactory(QuickEditModals.LEVELS),
              condition: this.canEdit,
            },
            {
              label: this.$tr('editLearningActivities'),
              onClick: this.quickEditModalFactory(QuickEditModals.LEARNING_ACTIVITIES),
              condition: this.canEdit && !this.isTopic,
            },
          ],
          [
            {
              label: this.$tr('editSource'),
              onClick: this.quickEditModalFactory(QuickEditModals.SOURCE),
              condition: this.canEdit && !this.isTopic,
            },
            {
              label: this.$tr('editAudience'),
              onClick: this.quickEditModalFactory(QuickEditModals.AUDIENCE),
              condition: this.canEdit && !this.isTopic,
            },
          ],
          [
            {
              label: this.$tr('editCompletion'),
              onClick: this.quickEditModalFactory(QuickEditModals.COMPLETION),
              condition: this.canEdit && !this.isTopic,
            },
            {
              label: this.$tr('editWhatIsNeeded'),
              onClick: this.quickEditModalFactory(QuickEditModals.WHAT_IS_NEEDED),
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
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      this.focusFirstOption();
    },
    destroyed() {
      this.lastFocus && this.lastFocus.focus();
    },
    methods: {
      ...mapActions(['showSnackbar', 'clearSnackbar']),
      ...mapActions('contentNode', [
        'createContentNode',
        'moveContentNodes',
        'copyContentNode',
        'waitForCopyingStatus',
        'setQuickEditModal',
      ]),
      ...mapActions('clipboard', ['copy']),
      async focusFirstOption() {
        const { optionsList } = this.$refs;
        const firstOption = optionsList.$el.querySelector('a');
        let tries = 0;
        while (document.activeElement !== firstOption && tries++ < 20) {
          await new Promise(resolve => setTimeout(resolve, 0));
          firstOption.focus();
        }
      },
      checkTabBoundaries($event) {
        const optionsList = this.$refs.optionsList;
        const options = optionsList.$el.querySelectorAll('a');
        const index = Array.from(options).indexOf($event.target);
        if (
          (index === 0 && $event.shiftKey) ||
          (index === options.length - 1 && !$event.shiftKey)
        ) {
          // destroy component
          $event.preventDefault();
          this.$destroy();
        }
      },
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
        return this.moveContentNodes({
          id__in: [this.nodeId],
          parent: target,
          inherit: this.node.parent !== target,
        }).then(this.$refs.moveModal.moveComplete);
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
      quickEditModalFactory(modal) {
        return $event => {
          $event.preventDefault();
          this.setQuickEditModal({
            modal,
            nodeIds: [this.nodeId],
          });
          const trackActionLabel = modal.replace(/_/g, ' ').toLowerCase();
          this.trackAction(`Edit ${trackActionLabel}`);
        };
      },
      removeNode: withChangeTracker(function(id__in, changeTracker) {
        this.trackAction('Delete');
        const redirect = this.getRemoveNodeRedirect();
        return this.moveContentNodes({ id__in, parent: this.trashId, inherit: false }).then(() => {
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
      duplicateNode: withChangeTracker(async function(nodeId, changeTracker) {
        this.trackAction('Copy');
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          // TODO: determine how to cancel copying while it's in progress,
          // TODO: if that's something we want
          // actionText: this.$tr('cancel'),
          // actionCallback: () => changeTracker.revert(),
        });
        const copiedContentNode = await this.copyContentNode({
          id: nodeId,
          target: nodeId,
          position: RELATIVE_TREE_POSITIONS.RIGHT,
        });

        this.waitForCopyingStatus({
          contentNodeId: copiedContentNode.id,
          startingRev: changeTracker._startingRev,
        })
          .then(() => {
            this.showSnackbar({
              text: this.$tr('copiedSnackbar'),
              actionText: this.$tr('undo'),
              actionCallback: () => changeTracker.revert(),
            }).then(() => changeTracker.cleanUp());
          })
          .catch(() => {
            this.clearSnackbar();
            changeTracker.cleanUp();
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
      editAllDetails: 'Edit details',
      editTags: 'Edit tags',
      editLanguage: 'Edit language',
      editCategories: 'Edit categories',
      editLevels: 'Edit levels',
      editLearningActivities: 'Edit learning activities',
      editSource: 'Edit source',
      editAudience: 'Edit audience',
      editCompletion: 'Edit completion',
      editWhatIsNeeded: 'Edit requirements',
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
