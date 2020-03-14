<template>

  <VLayout row wrap>
    <router-link
      v-if="node && !root"
      :to="treeLink"
      tag="v-flex"
      xs12
      class="node-item pa-1"
      style="width: 100%;"
      :style="{backgroundColor: selected? $vuetify.theme.greyBackground : 'transparent' }"
    >
      <ContextMenu>
        <VLayout row align-center>
          <VFlex shrink style="min-width: 40px;">
            <VBtn
              v-if="showExpansion"
              icon
              small
              :style="{transform: expanded? 'rotate(90deg)' : 'rotate(0deg)'}"
              @click.stop="toggle"
            >
              <Icon>keyboard_arrow_right</Icon>
            </VBtn>
          </VFlex>
          <VFlex shrink>
            <Icon class="ma-1">
              {{ hasContent ? "folder" : "folder_open" }}
            </Icon>
          </VFlex>
          <VFlex
            xs9
            class="notranslate text-truncate px-1"
            :style="{color: $vuetify.theme.darkGrey}"
          >
            <VTooltip bottom open-delay="750">
              <template #activator="{ on }">
                <span v-on="on">{{ node.title }}</span>
              </template>
              <span>{{ node.title }}</span>
            </VTooltip>
          </VFlex>
          <VFlex shrink style="min-width: 20px;">
            <VProgressCircular
              v-if="loading"
              indeterminate
              size="15"
              width="2"
            />
            <VMenu v-else offset-y right>
              <template #activator="{ on }">
                <VBtn
                  class="topic-menu ma-0 mr-2"
                  small
                  icon
                  flat
                  v-on="on"
                  @click.stop
                >
                  <Icon>more_horiz</Icon>
                </VBtn>
              </template>
              <ContentNodeOptions :nodeId="nodeId" />
            </VMenu>
          </VFlex>
        </VLayout>
        <template #menu>
          <div class="caption grey--text notranslate px-3 pt-2">
            {{ node.title }}
          </div>
          <ContentNodeOptions :nodeId="nodeId" />
        </template>
      </ContextMenu>
    </router-link>
    <VFlex v-if="node && (root || hasContent) && !loading" xs12>
      <VSlideYTransition>
        <div v-show="expanded" class="ml-4">
          <StudioTree
            v-for="child in children"
            v-show="child.kind === 'topic'"
            :key="child.id"
            :nodeId="child.id"
          />
        </div>
      </VSlideYTransition>
    </VFlex>
  </VLayout>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../constants';
  import ContentNodeOptions from './ContentNodeOptions';
  import ContextMenu from 'shared/views/ContextMenu';

  export default {
    name: 'StudioTree',
    components: {
      ContextMenu,
      ContentNodeOptions,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      root: {
        type: Boolean,
        default: false,
      },
    },
    data: () => {
      return {
        loading: false,
        loaded: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren', 'nodeExpanded']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      children() {
        return this.getContentNodeChildren(this.nodeId);
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
        return this.nodeId === this.$route.params.nodeId;
      },
      treeLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.nodeId,
          },
        };
      },
    },
    created() {
      if (this.expanded || this.selected) {
        if (!this.node) {
          this.loadContentNode(this.nodeId).then(this.getChildren);
        } else {
          this.getChildren();
        }
      }
      if (this.selected) {
        // Always expand the selected node
        this.setExpansion({ id: this.nodeId, expanded: true });
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
            channel_id: this.$store.state.currentChannel.currentChannelId,
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
    $trs: {},
  };

</script>

<style scoped lang="less">

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

</style>
