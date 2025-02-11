<template>

  <DraggableItem
    :draggableId="contentNode.id"
    :draggableMetadata="contentNode"
    :dragEffect="dragEffect"
    :dropEffect="draggableDropEffect"
    :beforeStyle="dragBeforeStyle"
    :afterStyle="dragAfterStyle"
  >
    <template #default>
      <ContentNodeListItem
        :node="contentNode"
        :compact="compact"
        :comfortable="comfortable"
        :active="active"
        :canEdit="canEdit"
        :draggableHandle="{
          grouped: selected,
          draggable,
          draggableMetadata: contentNode,
          effectAllowed: draggableEffectAllowed,
        }"
        :aria-selected="selected"
        class="content-node-edit-item"
        @infoClick="$emit('infoClick', $event)"
        @topicChevronClick="$emit('topicChevronClick', $event)"
      >
        <template #actions-start="{ hover }">
          <VListTileAction class="handle-col" :aria-hidden="!hover" @click.stop>
            <transition name="fade">
              <VBtn :disabled="copying" flat icon>
                <Icon :color="$themePalette.grey.v_700" icon="dragVertical" />
              </VBtn>
            </transition>
          </VListTileAction>
          <VListTileAction class="mx-2 select-col" @click.stop>
            <Checkbox
              v-model="selected"
              :disabled="copying"
              class="mt-0 pt-0"
              @dblclick.stop
            />
          </VListTileAction>
        </template>

        <template #actions-end>
          <VListTileAction v-if="canEdit" class="action-icon px-1" @click.stop>
            <transition name="fade">
              <IconButton
                icon="rename"
                size="small"
                :text="$tr('editTooltip')"
                :disabled="copying"
                @click.stop
                @click="editTitleDescription()"
              />
            </transition>
          </VListTileAction>
          <VListTileAction :aria-hidden="!active" class="action-icon px-1">
            <Menu v-model="activated">
              <template #activator="{ on }">
                <IconButton
                  icon="optionsVertical"
                  :text="$tr('optionsTooltip')"
                  size="small"
                  :disabled="copying"
                  v-on="on"
                  @click.stop
                />
              </template>
              <ContentNodeOptions v-if="!copying && activated" :nodeId="nodeId" />
            </Menu>
          </VListTileAction>
        </template>

        <template #copy-fail-retry-action>
          <span v-if="hasCopyingErrored">
            <ActionLink class="copy-retry-btn" :text="$tr('retryCopy')" @click="retryFailedCopy" />
          </span>
        </template>

        <template #copy-fail-remove-action>
          <IconButton
            v-if="hasCopyingErrored"
            icon="close"
            :text="$tr('removeNode')"
            size="small"
            @click="removeFailedCopyNode"
          />
        </template>

        <template #context-menu="{ showContextMenu, positionX, positionY }">
          <ContentNodeContextMenu
            :show="showContextMenu"
            :positionX="positionX"
            :positionY="positionY"
            :nodeId="nodeId"
          />
        </template>
      </ContentNodeListItem>
    </template>
  </DraggableItem>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';

  import ContentNodeListItem from './ContentNodeListItem';
  import ContentNodeOptions from './ContentNodeOptions';
  import ContentNodeContextMenu from './ContentNodeContextMenu';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import DraggableItem from 'shared/views/draggable/DraggableItem';
  import { ContentNode } from 'shared/data/resources';
  import { DragEffect, DropEffect, EffectAllowed } from 'shared/mixins/draggable/constants';
  import { QuickEditModals, DraggableRegions } from 'frontend/channelEdit/constants';
  import { withChangeTracker } from 'shared/data/changes';
  import { COPYING_STATUS, COPYING_STATUS_VALUES } from 'shared/data/constants';

  export default {
    name: 'ContentNodeEditListItem',
    components: {
      DraggableItem,
      ContentNodeListItem,
      ContentNodeOptions,
      ContentNodeContextMenu,
      Checkbox,
      IconButton,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      select: {
        type: Boolean,
        default: false,
      },
      previewing: {
        type: Boolean,
        default: false,
      },
      compact: {
        type: Boolean,
        default: false,
      },
      comfortable: {
        type: Boolean,
        default: false,
      },
      /**
       * The `hasSelection` prop is used for disabling draggability specifically to handle
       * behaviors related to selecting and dragging multiple items.
       */
      /* eslint-disable-next-line kolibri/vue-no-unused-properties */
      hasSelection: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        activated: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'isNodeInCopyingState',
        'hasNodeCopyingErrored',
      ]),
      ...mapGetters('draggable', ['activeDraggableRegionId']),
      selected: {
        get() {
          return this.select;
        },
        set(value) {
          this.$emit(value ? 'select' : 'deselect');
        },
      },
      active() {
        return this.selected || this.activated || this.previewing;
      },
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
      draggable() {
        // TODO: When we allow selecting multiple and then dragging
        // return (this.selected || !this.hasSelection);
        return !this.copying;
      },
      copying() {
        return this.isNodeInCopyingState(this.nodeId);
      },
      hasCopyingErrored() {
        return this.hasNodeCopyingErrored(this.nodeId);
      },
      dragEffect() {
        return DragEffect.SORT;
      },
      draggableDropEffect() {
        if (!this.canEdit) {
          return DropEffect.NONE;
        }

        return this.activeDraggableRegionId === DraggableRegions.CLIPBOARD
          ? DropEffect.COPY
          : DropEffect.MOVE;
      },
      draggableEffectAllowed() {
        if (this.canEdit && !this.copying) {
          return EffectAllowed.COPY_OR_MOVE;
        } else if (!this.copying) {
          return EffectAllowed.COPY;
        }
        return EffectAllowed.NONE;
      },
      dragBeforeStyle() {
        return (size, height) => ({
          '::before': {
            height: `${height}px`,
          },
        });
      },
      dragAfterStyle() {
        return (size, height) => ({
          '::after': {
            height: `${height}px`,
          },
        });
      },
    },
    beforeDestroy() {
      // Unselect before removing
      if (this.selected) {
        this.selected = false;
      }
    },
    methods: {
      ...mapActions(['showSnackbar', 'clearSnackbar']),
      ...mapActions('contentNode', [
        'updateContentNode',
        'waitForCopyingStatus',
        'deleteContentNode',
        'setQuickEditModal',
      ]),
      editTitleDescription() {
        this.setQuickEditModal({
          modal: QuickEditModals.TITLE_DESCRIPTION,
          nodeIds: [this.nodeId],
        });
      },
      retryFailedCopy: withChangeTracker(function(changeTracker) {
        this.updateContentNode({
          id: this.nodeId,
          checkComplete: true,
          [COPYING_STATUS]: COPYING_STATUS_VALUES.COPYING,
        });

        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          // TODO: determine how to cancel copying while it's in progress,
          // TODO: if that's something we want
          // actionText: this.$tr('cancel'),
          // actionCallback: () => changeTracker.revert(),
        });

        ContentNode.retryCopyChange(this.nodeId);

        return this.waitForCopyingStatus({
          contentNodeId: this.nodeId,
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
      removeFailedCopyNode() {
        return this.deleteContentNode(this.nodeId);
      },
    },
    $trs: {
      optionsTooltip: 'Options',
      removeNode: 'Remove',
      retryCopy: 'Retry',
      creatingCopies: 'Copying...',
      copiedSnackbar: 'Copy operation complete',
      undo: 'Undo',
      editTooltip: 'Edit title and description',
    },
  };

</script>


<style lang="scss" scoped>

  .content-node-edit-item {
    position: relative;
    transition: height ease 0.2s;

    &::before,
    &::after {
      display: block;
      width: 100%;
      height: 0;
      overflow: hidden;
      content: ' ';
      /* stylelint-disable-next-line custom-property-pattern */
      background: var(--v-draggableDropZone-base);
      transition: height ease 0.2s, bottom ease 0.2s;
    }

    &.active-draggable {
      overflow: hidden;

      &::before {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 100%;
        left: 0;
        z-index: 1000;
        height: auto !important;
      }

      &::after {
        display: none;
      }

      &.dragging-over {
        &::before {
          bottom: 0;
        }
      }

      &:not(.dragging-over) {
        border-bottom: 0;
      }
    }
  }

  .select-col {
    width: 24px;
    min-width: 24px;
    opacity: 1;
  }

  .handle-col {
    width: 32px;
    min-width: 32px;
  }

  .handle-col .v-btn {
    margin-left: 2px !important;
    cursor: grab;
  }

  ::v-deep .v-input--selection-controls__input {
    margin-right: 0;
  }

  .action-icon {
    display: flex;
    flex: 1 1 auto;
    align-items: flex-start;
    justify-content: center;
  }

  .copy-retry-btn {
    padding-bottom: 2px;
    font-size: inherit;
  }

</style>
