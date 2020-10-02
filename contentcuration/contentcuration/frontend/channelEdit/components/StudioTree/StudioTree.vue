<template>

  <VLayout row wrap>
    <LoadingText v-if="root && loading" class="loading-text" absolute />
    <VFlex
      v-if="node && !root"
      tag="v-flex"
      xs12
      class="node-item pa-1"
      style="width: 100%;"
      data-test="item"
      :style="{backgroundColor: selected? $vuetify.theme.greyBackground : 'transparent' }"
      @click="onNodeClick(node.id)"
    >
      <ContextMenu :disabled="!allowEditing">
        <VLayout row align-center style="height: 40px">
          <VFlex shrink style="min-width: 40px;" class="text-xs-center">
            <VBtn
              v-if="showExpansion"
              icon
              data-test="expansionToggle"
              class="ma-0"
              :style="{transform: toggleTransform}"
              @click.stop="toggle"
            >
              <Icon>keyboard_arrow_right</Icon>
            </VBtn>
          </VFlex>
          <VFlex shrink>
            <div class="invalid-icon">
              <ContentNodeValidator dot :node="node" size="8" />
            </div>
            <Icon class="mx-1">
              {{ hasContent ? "folder" : "folder_open" }}
            </Icon>
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
                offset-y
                right
                data-test="editMenu"
              >
                <template #activator="{ on }">
                  <IconButton
                    icon="optionsHorizontal"
                    :text="$tr('optionsTooltip')"
                    v-on="on"
                    @click.stop
                  />
                </template>
                <ContentNodeOptions :nodeId="nodeId" />
              </VMenu>
            </div>
          </VFlex>
        </VLayout>
        <template #menu>
          <div class="caption grey--text notranslate px-3 pt-2">
            {{ node.title }}
          </div>
          <ContentNodeOptions :nodeId="nodeId" />
        </template>
      </ContextMenu>
    </VFlex>
    <VFlex v-if="node && (root || hasContent) && !loading" xs12>
      <VSlideYTransition>
        <div v-show="expanded" :class="{'ml-4': !root}">
          <StudioTree
            v-for="child in subtopics"
            :key="child.id"
            :nodeId="child.id"
            :selectedNodeId="selectedNodeId"
            :allowEditing="allowEditing"
            :onNodeClick="onNodeClick"
          />
        </div>
      </VSlideYTransition>
    </VFlex>
  </VLayout>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';

  import ContentNodeOptions from '../ContentNodeOptions';
  import ContentNodeChangedIcon from '../ContentNodeChangedIcon';
  import ContentNodeValidator from '../ContentNodeValidator';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import ContextMenu from 'shared/views/ContextMenu';
  import LoadingText from 'shared/views/LoadingText';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'StudioTree',
    components: {
      ContextMenu,
      ContentNodeOptions,
      ContentNodeChangedIcon,
      ContentNodeValidator,
      LoadingText,
      IconButton,
    },
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
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
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
        return Boolean(this.node.title.trim());
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
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren', 'loadContentNode']),
      ...mapMutations('contentNode', {
        toggleExpansion: 'TOGGLE_EXPANSION',
        setExpansion: 'SET_EXPANSION',
      }),
      getChildren() {
        if (this.hasContent && !this.loaded && this.expanded) {
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
    },
    $trs: {
      optionsTooltip: 'Options',
      missingTitle: 'Missing title',
    },
  };

</script>

<style scoped lang="less">

  .invalid-icon {
    position: absolute;
    margin-top: -4px;
    margin-left: 4px;
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
