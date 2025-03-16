<template>

  <DraggableCollection
    :draggableSize="draggableSize"
    :draggableMetadata="node"
    :dropEffect="dropEffect"
  >
    <VLayout
      class="tree-container"
      row
      wrap
      :class="{ 'is-root': root }"
    >
      <LoadingText v-if="root && loading" class="loading-text" absolute />
      <DraggableItem
        :draggableSize="draggableSize"
        :draggableMetadata="node"
        :dropEffect="activeDropEffect"
        @draggableDragEnter="dragEnter"
        @draggableDragLeave="dragLeave"
      >
        <template #default="itemProps">
          <ContextMenuCloak :disabled="!allowEditing || copying">
            <template #default="{ showContextMenu, positionX, positionY }">
              <VFlex
                v-if="node && !root"
                tag="v-flex"
                class="node-item px-1"
                :class="{
                  disabled: copying,
                }"
                :style="{
                  backgroundColor: !root && selected
                    ? $vuetify.theme.greyBackground
                    : 'transparent',
                }"
                data-test="item"
                @click="click"
              >
                <DraggableHandle
                  :draggable="draggable"
                  :draggableMetadata="node"
                  :effectAllowed="draggableEffectAllowed"
                >
                  <VLayout
                    row
                    align-center
                    class="draggable-background"
                    :style="{
                      height: '40px',
                      backgroundColor: itemProps.isDraggingOver && itemProps.isDropAllowed
                        ? $vuetify.theme.draggableDropZone
                        : 'transparent'
                    }"
                  >
                    <div v-if="copying" class="disabled-overlay"></div>
                    <VFlex shrink style="min-width: 28px;" class="text-xs-center">
                      <VBtn
                        v-if="showExpansion"
                        icon
                        class="ma-0"
                        data-test="expansionToggle"
                        :style="{ transform: toggleTransform }"
                        @click.stop="toggle"
                      >
                        <Icon icon="chevronRight" />
                      </VBtn>
                    </VFlex>
                    <VFlex shrink class="px-1">
                      <VTooltip :disabled="!hasTitle(node)" bottom open-delay="500" lazy>
                        <template #activator="{ on }">
                          <VIconWrapper v-on="on">
                            {{ node.resource_count ? "folder" : "folder_open" }}
                          </VIconWrapper>
                        </template>
                        <span>{{ getTitle(node) }}</span>
                      </VTooltip>
                    </VFlex>
                    <VFlex
                      class="caption px-1 text-truncate"
                      :class="getTitleClass(node)"
                    >
                      <span v-if="hasTitle(node) || !allowEditing" class="content-title">
                        {{ getTitle(node) }}
                      </span>
                      <span v-else class="red--text">
                        {{ $tr('missingTitle') }}
                      </span>
                    </VFlex>
                    <VSpacer />
                    <VFlex v-if="canEdit && !copying" shrink>
                      <ContentNodeValidator
                        v-if="!node.complete || node.error_count"
                        :node="node"
                        hideTitleValidation
                      />
                      <ContentNodeChangedIcon v-else :node="node" />
                    </VFlex>
                    <VFlex
                      v-if="copying"
                      class="mx-2"
                      style="width: 24px;"
                      shrink
                    >
                      <ContentNodeCopyTaskProgress
                        class="progress-loader"
                        :node="node"
                        size="24"
                        showTooltip
                      />
                    </VFlex>
                    <VFlex
                      v-if="allowEditing && !copying"
                      style="width: 40px;"
                      shrink
                    >
                      <VProgressCircular
                        v-if="loading"
                        class="mx-3"
                        indeterminate
                        color="loading"
                        size="15"
                        width="2"
                      />
                      <Menu
                        v-else
                        v-model="showMenu"
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
                        <ContentNodeOptions v-if="showMenu" :nodeId="nodeId" />
                      </Menu>
                    </VFlex>
                    <ContentNodeContextMenu
                      v-if="allowEditing && !copying"
                      :show="showContextMenu"
                      :positionX="positionX"
                      :positionY="positionY"
                      :nodeId="nodeId"
                      data-test="contextMenu"
                    >
                      <div class="caption grey--text pt-2 px-3" :class="getTitleClass(node)">
                        {{ getTitle(node) }}
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
      <VFlex v-if="node && (root || hasContent) && !loading && !copying">
        <VSlideYTransition>
          <div v-show="expanded" :class="{ 'ml-4': !root }" class="nested-tree">
            <StudioTree
              v-for="child in subtopics"
              :key="child.id"
              :nodeId="child.id"
              :selectedNodeId="selectedNodeId"
              :allowEditing="allowEditing"
              :onNodeClick="onNodeClick"
              :dropEffect="dropEffect"
              @selected="onDescendentSelected"
            />
          </div>
        </VSlideYTransition>
      </VFlex>
    </VLayout>
  </DraggableCollection>

</template>

<script>

  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex';
  import debounce from 'lodash/debounce';

  import ContentNodeOptions from '../ContentNodeOptions';
  import ContentNodeChangedIcon from '../ContentNodeChangedIcon';
  import ContentNodeValidator from '../ContentNodeValidator';
  import ContentNodeContextMenu from '../ContentNodeContextMenu';
  import ContentNodeCopyTaskProgress from '../../views/progress/ContentNodeCopyTaskProgress';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import ContextMenuCloak from 'shared/views/ContextMenuCloak';
  import LoadingText from 'shared/views/LoadingText';
  import IconButton from 'shared/views/IconButton';
  import DraggableCollection from 'shared/views/draggable/DraggableCollection';
  import DraggableItem from 'shared/views/draggable/DraggableItem';
  import DraggableHandle from 'shared/views/draggable/DraggableHandle';
  import { titleMixin } from 'shared/mixins';
  import { DropEffect, EffectAllowed } from 'shared/mixins/draggable/constants';
  import { objectValuesValidator } from 'shared/mixins/draggable/utils';

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
      ContentNodeCopyTaskProgress,
    },
    mixins: [titleMixin],
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
        default: null,
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
      dropEffect: {
        type: String,
        default: DropEffect.NONE,
        validator: objectValuesValidator(DropEffect),
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
        showMenu: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapState('draggable', ['activeDraggableUniverse']),
      ...mapGetters('draggable', ['deepestActiveDraggable']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeChildren',
        'nodeExpanded',
        'isNodeInCopyingState',
      ]),
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
      draggableEffectAllowed() {
        if (this.allowEditing) {
          return this.canEdit ? EffectAllowed.COPY_OR_MOVE : EffectAllowed.COPY;
        }
        return EffectAllowed.NONE;
      },
      copying() {
        return this.node && this.isNodeInCopyingState(this.node.id);
      },
      activeDropEffect() {
        // Don't allow dropping into itself
        const { metadata } = this.deepestActiveDraggable || {};
        return metadata && metadata.id !== this.nodeId ? this.dropEffect : DropEffect.NONE;
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
      click() {
        if (!this.copying) {
          this.onNodeClick(this.node.id);
        }
      },
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
      dragEnter(e) {
        if (
          e.dataTransfer.effectAllowed !== DropEffect.NONE &&
          this.activeDropEffect !== DropEffect.NONE &&
          !this.draggableExpanded &&
          this.showExpansion &&
          !this.expanded
        ) {
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

<style scoped lang="scss">

  .v-badge ::v-deep .v-badge__badge {
    top: -5px;
    left: 10px;
  }

  .tree-container:not(.is-root) {
    position: relative;
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
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-draggableDropZone-base);
    }
  }

  .draggable-background {
    border-radius: 3px;
    transition: background-color ease 0.2s;
  }

  // size causes rows to shift
  ::v-deep .v-btn {
    width: 24px;
    height: 24px;
    margin: 0;
  }

  .disabled {
    pointer-events: none;
  }

  .disabled-overlay {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.5);
  }

  .progress-loader {
    z-index: 2;
    margin: auto 0;
    pointer-events: all;
    cursor: progress;
  }

  .node-item {
    width: 100%;
    padding-left: 14px;
    cursor: pointer;
  }

  .content-title {
    color: var(--v-darkGrey-base); /* stylelint-disable-line custom-property-pattern */
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
