<template>

  <VExpandXTransition>
    <ResizableNavigationDrawer
      v-if="open"
      right
      :localName="localName"
      :minWidth="400"
      :maxWidth="700"
      permanent
      clipped
      class="clipboard elevation-4"
      v-bind="$attrs"
    >
      <VLayout class="container pa-0 ma-0" column>
        <ToolBar
          class="header pa-0 ma-0"
          color="white"
          :flat="!elevated"
        >
          <VListTile class="grow">
            <VListTileAction>
              <Checkbox
                ref="checkbox"
                class="ma-0 pa-0"
                :value="selected"
                :label="selectionState ? '' : $tr('selectAll')"
                :indeterminate="indeterminate"
                @click.stop.prevent="goNextSelectionState"
              />
            </VListTileAction>
            <VListTileContent>
              <VSlideXTransition>
                <div v-if="selectionState">
                  <IconButton
                    v-if="canEdit"
                    icon="swap_horiz"
                    :text="$tr('moveSelectedButton')"
                    @click="moveNodes()"
                  />
                  <IconButton
                    icon="content_copy"
                    :text="$tr('duplicateSelectedButton')"
                    @click="duplicateNodes()"
                  />
                  <IconButton
                    icon="delete"
                    :text="$tr('deleteSelectedButton')"
                    @click="removeNodes()"
                  />
                </div>
              </VSlideXTransition>
            </VListTileContent>
            <VSpacer />
            <VListTileAction style="min-width: 24px">
              <IconButton
                class="ma-0"
                :icon="selectionState ? 'cancel' : 'close'"
                :text="selectionState ? $tr('cancel') : $tr('close')"
                @click="selectionState ? resetSelectionState() : $emit('close')"
              />
            </VListTileAction>
          </VListTile>
        </ToolBar>
        <VLayout
          ref="nodeList"
          class="node-list elevation-0"
          @scroll="scroll"
        >
          <VList focusable>
            <template v-for="channelId in channelIds">
              <Channel :key="channelId" :nodeId="channelId" />
            </template>
          </VList>
        </VLayout>
      </VLayout>
    </ResizableNavigationDrawer>
  </VExpandXTransition>

</template>
<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import Channel from './Channel';
  import clipboardMixin from './mixin';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import { promiseChunk } from 'shared/data/resources';
  import { SelectionFlags } from 'frontend/channelEdit/vuex/clipboard/constants';

  export default {
    name: 'Clipboard',
    components: {
      ResizableNavigationDrawer,
      Channel,
      Checkbox,
      IconButton,
      ToolBar,
    },
    mixins: [clipboardMixin],
    props: {
      // key for sessionStorage to store width data at
      localName: {
        type: String,
        default: 'clipboard',
      },
      open: {
        type: Boolean,
        default: false,
      },
      // For the underlying mixin
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nodeId: {
        type: String,
        default() {
          return this.clipboardRootId;
        },
      },
    },
    data() {
      return {
        refreshing: false,
        elevated: false,
      };
    },
    computed: {
      ...mapGetters(['clipboardRootId']),
      ...mapGetters('clipboard', ['channelIds', 'selectedNodes', 'selectedChannels']),
      selectedNodeIds() {
        return this.selectedNodes.map(n => n.id);
      },
      canEdit() {
        return this.selectedChannels.length
          ? !this.selectedChannels.find(channel => !channel.edit)
          : false;
      },
      selected() {
        return Boolean(this.selectionState & SelectionFlags.ALL_DESCENDANTS);
      },
      // Overrides mixin, since entire clipboard tree cannot be selected
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nextSelectionState() {
        const current = this.selectionState;

        return current === SelectionFlags.NONE || current & SelectionFlags.INDETERMINATE
          ? SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS
          : SelectionFlags.NONE;
      },
    },
    watch: {
      open(open) {
        if (open) {
          this.refresh();
        }
      },
    },
    mounted() {
      this.refresh();
    },
    methods: {
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      ...mapActions('clipboard', ['loadChannels', 'copy']),
      refresh() {
        if (this.refreshing) {
          return;
        }

        this.refreshing = true;
        this.loadChannels().then(() => (this.refreshing = false));
      },
      scroll() {
        this.elevated = this.$refs.nodeList.scrollTop > 0;
      },
      moveNodes() {
        if (!this.selectedNodeIds.length) {
          return;
        }

        this.setMoveNodes(this.selectedNodeIds);
      },
      duplicateNodes() {
        if (!this.selectedNodeIds.length) {
          return;
        }

        promiseChunk(this.selectedNodeIds, 1, ([id]) => {
          return this.copy({ id, deep: true });
        }).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: 'Duplicated',
          });
        });
      },
      removeNodes() {
        const ids = this.selectedNodeIds;
        if (!ids.length) {
          return;
        }

        this.moveContentNodes({ ids, parent: this.trashRootId }).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: this.$tr('removedItemsMessage', { count: ids.length }),
          });
        });
      },
    },
    $trs: {
      selectAll: 'Select all',
      cancel: 'Cancel',
      close: 'Close',
      duplicateSelectedButton: 'Duplicate selected items on clipboard',
      moveSelectedButton: 'Move selected items',
      deleteSelectedButton: 'Remove selected items from clipboard',
      removedItemsMessage: 'Sent {count, plural,\n =1 {# item}\n other {# items}} to the trash',
    },
  };

</script>
<style lang="less" scoped>

  .clipboard {
    position: absolute;
    background: rgb(250, 250, 250) !important;
  }

  .container,
  /deep/ .drawer-contents {
    max-height: 100vh;
  }

  .node-list,
  .header {
    position: relative;
  }

  .header {
    z-index: 4;
  }

  /deep/ .header .v-list__tile {
    border-left: 5px solid transparent;
  }

  .node-list {
    max-width: 100%;
    overflow: auto;
  }

  .v-list {
    width: 100%;
    max-width: 100%;
    padding: 0 0 64px;
  }

  .channel-item:nth-child(n + 2) {
    background-color: #f9f9f9;
  }

  /deep/ .v-toolbar__content {
    padding: 0;
  }

  /deep/ .v-list__group--active::before {
    background: none !important;
  }

  /deep/ .channel-item:last-child::after {
    background: rgba(0, 0, 0, 0.12) !important;
  }

</style>
