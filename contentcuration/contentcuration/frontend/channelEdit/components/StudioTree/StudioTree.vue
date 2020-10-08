<template>

  <DraggableCollection
    :draggableSize="draggableSize"
    :beforeStyle="false"
    :afterStyle="false"
  >
    <template #default="collectionProps">
      <VLayout
        class="tree-container"
        row
        wrap
        :class="{'is-root': root}"
      >
        <LoadingText v-if="root && loading" class="loading-text" absolute />
        <DraggableItem
          :draggableSize="draggableSize"
          :beforeStyle="false"
          :afterStyle="false"
          @draggableDragEnter="dragEnter"
          @draggableDragLeave="dragLeave"
        >
          <template #default="itemProps">

            <ContextMenuCloak :disabled="!allowEditing">
              <template #default="{ showContextMenu, positionX, positionY }">
                <VFlex
                  v-if="node && !root"
                  tag="v-flex"
                  xs12
                  class="node-item pr-1"
                  :style="{
                    backgroundColor: !root && selected
                      ? $vuetify.theme.greyBackground
                      : 'transparent',
                  }"
                  data-test="item"
                  @click="onNodeClick(node.id)"
                >
                  <DraggableHandle :draggable="draggable">
                    <VLayout
                      row
                      align-center
                      class="draggable-background"
                      :style="{
                        backgroundColor: itemProps.isDraggingOver
                          ? $vuetify.theme.draggableDropZone
                          : 'transparent'
                      }"
                    >
                      <VFlex shrink style="min-width: 28px;" class="text-xs-center">
                        <VBtn
                          v-if="showExpansion"
                          icon
                          class="ma-0"
                          data-test="expansionToggle"
                          :style="{transform: toggleTransform}"
                          @click.stop="toggle"
                        >
                          <Icon>keyboard_arrow_right</Icon>
                        </VBtn>
                      </VFlex>
                      <VFlex shrink class="px-1">
                        <ContentNodeValidator badge :node="node">
                          <Icon>
                            {{ hasContent ? "folder" : "folder_open" }}
                          </Icon>
                        </ContentNodeValidator>
                      </VFlex>
                      <VFlex
                        xs9
                        class="px-1 caption text-truncate"
                      >
                        <VTooltip v-if="hasTitle" bottom open-delay="500">
                          <template #activator="{ on }">
                            <span
                              class="notranslate"
                              :style="{color: $vuetify.theme.darkGrey}"
                              v-on="on"
                            >
                              {{ node.title }}
                            </span>
                          </template>
                          <span>{{ node.title }}</span>
                        </VTooltip>
                        <span v-else class="red--text">{{ $tr('missingTitle') }}</span>
                      </VFlex>
                      <VFlex shrink>
                        <ContentNodeChangedIcon v-if="canEdit" :node="node" />
                      </VFlex>
                      <VFlex shrink style="min-width: 20px;" class="mx-2">
                        <VProgressCircular
                          v-if="loading"
                          indeterminate
                          size="15"
                          width="2"
                        />
                        <div v-if="allowEditing && !loading" class="topic-menu mr-2">
                          <VMenu
                            v-if="allowEditing && !loading"
                            offset-y
                            right
                            data-test="editMenu"
                          >
                            <template #activator="{ on }">
                              <IconButton
                                icon="optionsVertical"
                                :text="$tr('optionsTooltip')"
                                v-on="on"
                                @click.stop
                              />
                            </template>
                            <ContentNodeOptions :nodeId="nodeId" />
                          </VMenu>
                        </div>
                      </VFlex>
                      <ContentNodeContextMenu
                        v-if="allowEditing"
                        :show="showContextMenu"
                        :positionX="positionX"
                        :positionY="positionY"
                        :nodeId="nodeId"
                        data-test="contextMenu"
                      >
                        <div class="caption grey--text notranslate px-3 pt-2">
                          {{ node.title }}
                        </div>
                        <ContentNodeOptions :nodeId="nodeId" />
                      </ContentNodeContextMenu>
                    </VLayout>
                  </DraggableHandle>
                </VFlex>

              </template>
            </ContextMenuCloak>
          </template>
        </DraggableItem>
        <VFlex v-if="node && (root || hasContent) && !loading" xs12>
          <VSlideYTransition>
            <div v-show="expanded" :class="{'ml-4': !root}" class="nested-tree">
              <StudioTree
                v-for="child in subtopics"
                :key="child.id"
                :nodeId="child.id"
                :selectedNodeId="selectedNodeId"
                :allowEditing="allowEditing"
                :onNodeClick="onNodeClick"
                @selected="onDescendentSelected"
              />
            </div>
          </VSlideYTransition>
        </VFlex>
      </VLayout>
    </template>
  </DraggableCollection>

</template>

<script>

  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex';
  import debounce from 'lodash/debounce';

  import ContentNodeOptions from '../ContentNodeOptions';
  import ContentNodeChangedIcon from '../ContentNodeChangedIcon';
  import ContentNodeValidator from '../ContentNodeValidator';
  import ContentNodeContextMenu from '../ContentNodeContextMenu';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import ContextMenuCloak from 'shared/views/ContextMenuCloak';
  import LoadingText from 'shared/views/LoadingText';
  import IconButton from 'shared/views/IconButton';
  import DraggableCollection from 'shared/views/draggable/DraggableCollection';
  import DraggableItem from 'shared/views/draggable/DraggableItem';
  import DraggableHandle from 'shared/views/draggable/DraggableHandle';

  export default {
    name: 'StudioTree',
    components: {
      DraggableHandle,
      DraggableItem,
      DraggableCollection,
      ContextMenuCloak,
      ContentNodeContextMenu,
      ContentNodeOptions,
      ContentNodeChangedIcon,
      ContentNodeValidator,
      LoadingText,
      IconButton,
    },
    inject: ['draggableUniverse'],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      onNodeClick: {
        type: Function,
        required: true,
      },
      selectedNodeId: {
        type: String,
        required: false,
      },
      allowEditing: {
        type: Boolean,
        required: false,
        default: false,
      },
      root: {
        type: Boolean,
        default: false,
      },
      dataPreloaded: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        ContentKindsNames,
        loading: false,
        loaded: this.dataPreloaded,
        descendentSelected: false,
        draggableSize: 5,
        draggableExpanded: false,
        debouncedLoad: null,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapState('draggable', ['activeDraggableUniverse']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren', 'nodeExpanded']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      children() {
        return this.getContentNodeChildren(this.nodeId) || [];
      },
      subtopics() {
        return this.children.filter(child => child.kind === this.ContentKindsNames.TOPIC);
      },
      showExpansion() {
        return this.node && this.node.total_count > this.node.resource_count;
      },
      hasTitle() {
        return Boolean(this.node.title && this.node.title.trim());
      },
      hasContent() {
        return this.node && this.node.total_count;
      },
      expanded() {
        return this.root || this.nodeExpanded(this.nodeId);
      },
      selected() {
        return this.nodeId === this.selectedNodeId;
      },
      toggleTransform() {
        if (this.$isRTL) {
          return this.expanded ? 'rotate(90deg)' : 'rotate(180deg)';
        }
        return this.expanded ? 'rotate(90deg)' : 'rotate(0deg)';
      },
      draggable() {
        return this.allowEditing && !this.selected && !this.descendentSelected;
      },
    },
    watch: {
      activeDraggableUniverse(universe) {
        // Topics will revert to previous state if expanded by dragging over when dragging stops
        if (universe !== this.draggableUniverse) {
          if (this.draggableExpanded && this.expanded) {
            this.toggleExpansion(this.nodeId);
          }

          this.draggableExpanded = false;
        }
      },
      selected() {
        this.emitSelected();
      },
    },
    created() {
      if (this.selected) {
        // Always expand the selected node
        this.setExpansion({ id: this.nodeId, expanded: true });
      }

      if (this.expanded) {
        if (!this.node) {
          this.loadContentNode(this.nodeId).then(this.getChildren);
        } else {
          this.getChildren();
        }
      }

      this.debouncedLoad = debounce(() => this.toggle(), 500);
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren', 'loadContentNode']),
      ...mapMutations('contentNode', {
        toggleExpansion: 'TOGGLE_EXPANSION',
        setExpansion: 'SET_EXPANSION',
      }),
      getChildren() {
        if (this.hasContent && !this.loading && !this.loaded && this.expanded) {
          this.loading = true;
          return this.loadChildren({
            parent: this.nodeId,
          }).then(() => {
            this.loading = false;
            this.loaded = true;
          });
        }
        return Promise.resolve();
      },
      toggle() {
        this.toggleExpansion(this.nodeId);
        if (this.expanded) {
          this.getChildren();
        }
      },
      dragEnter() {
        if (!this.draggableExpanded && this.showExpansion && !this.expanded) {
          this.draggableExpanded = true;
          this.debouncedLoad();
        }
      },
      dragLeave() {
        this.debouncedLoad.cancel();

        if (!this.loading && !this.loaded && !this.expanded) {
          this.draggableExpanded = false;
        }
      },
      emitSelected() {
        this.$emit('selected', this.selected || this.descendentSelected);
      },
      onDescendentSelected(selected) {
        this.descendentSelected = selected;
        this.emitSelected();
      },
    },
    $trs: {
      optionsTooltip: 'Options',
      missingTitle: 'Missing title',
    },
  };

</script>

<style scoped lang="less">

  .v-badge /deep/ .v-badge__badge {
    top: -5px;
    left: 10px;
  }

  .tree-container:not(.is-root) {
    position: relative;
    padding: 3px 0;
    transition: height ease 0.2s;

    &::before,
    &:last-child::after {
      display: block;
      width: 100%;
      height: 0;
      overflow: hidden;
      content: ' ';
      background-color: transparent;
      transition: background-color ease 0.2s, height ease 0.2s;
    }

    &::before {
      height: 5px;
    }

    &.dragging-over-top::before,
    &.dragging-over-bottom + &.tree-container::before,
    &.dragging-over-bottom:last-child::after {
      height: 5px;
      background-color: #cccccc;
    }
  }

  .draggable-background {
    border-radius: 3px;
    transition: background-color ease 0.2s;
  }

  // size causes rows to shift
  /deep/ .v-btn {
    width: 24px;
    height: 24px;
    margin: 0;
  }

  .topic-menu {
    display: none;
  }

  .node-item {
    width: 100%;
    padding-left: 14px;
    cursor: pointer;

    &:hover .topic-menu {
      display: block;
    }
  }

  .slide-y-transition-enter-active,
  .slide-y-transition-leave-active {
    transition-duration: 0.25s;
  }

  .loading-text {
    /* Centers the loading spinner in the tree view vertically */

    /* 56px is the height of appbar in this context */
    max-height: calc(100vh - 56px);
  }

</style>
