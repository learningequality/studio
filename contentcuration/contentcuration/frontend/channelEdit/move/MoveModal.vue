<template>

  <VDialog
    v-model="dialog"
    fullscreen
    scrollable
    app
    lazy
    persistent
    attach="body"
  >
    <VCard>
      <VToolbar
        dark
        color="primary"
        app
        :extended="!loading"
        :extension-height="48"
        flat
        clipped-right
      >
        <VBtn icon exact data-test="close" @click="dialog=false">
          <Icon>close</Icon>
        </VBtn>
        <VToolbarTitle>
          {{ $tr("moveItems", {count: moveNodeIds.length}) }}
          <b class="notranslate">{{ currentNode.title }}</b>
        </VToolbarTitle>
        <template v-if="!loading" #extension>
          <ToolBar dense color="white" light>
            <Breadcrumbs :items="crumbs" class="py-0">
              <template #item="{item, isLast}">
                <span
                  style="cursor: pointer;"
                  class="notranslate"
                  :class="isLast? 'font-weight-bold' : 'grey--text'"
                  @click="targetNodeId = item.id"
                >
                  {{ item.title }}
                </span>
              </template>
            </Breadcrumbs>
            <VSpacer />
            <VBtn flat data-test="newtopic" @click="showNewTopicModal = true">
              {{ $tr("addTopic") }}
            </VBtn>
          </ToolBar>
        </template>
      </VToolbar>
      <VContent style="padding-top: 112px; padding-bottom: 64px; background-color: white;">
        <!-- list of children content -->
        <LoadingText v-if="loading" absolute data-test="loading" />
        <VContainer v-else-if="!children.length" data-test="empty" fluid fill-height>
          <VLayout align-center justify-center class="subheading">
            <div>{{ $tr('emptyTopicText') }}</div>
          </VLayout>
        </VContainer>
        <VContainer
          v-else
          fluid
          align-content-start
          class="pa-0"
          style="max-height: calc(100vh - 178px); overflow-y: auto;"
        >
          <VCard
            v-for="node in children"
            :key="node.id"
            flat
            class="pa-4 content-card"
            :class="{disabled: isDisabled(node)}"
            data-test="listitem"
            @click="openTopic(node)"
          >
            <VLayout align-center row>
              <div style="min-width: 175px;">
                <Thumbnail
                  :src="node.thumbnail_src"
                  :kind="node.kind"
                  :isEmpty="!node.total_count"
                />
              </div>
              <VFlex class="pl-2">
                <VCardTitle class="headline notranslate pb-0">
                  {{ node.title }}
                </VCardTitle>
                <VCardText class="grey--text pt-0">
                  <div v-if="node.kind === 'topic'">
                    {{ $tr('resourcesCount', {count: node.resource_count || 0}) }}
                  </div>
                  <div class="notranslate subheading">
                    {{ node.description }}
                  </div>
                </VCardText>
              </VFlex>
              <VSpacer />
              <div style="min-width: 102px;">
                <VCardActions class="options">
                  <VBtn icon data-test="details" @click.stop="previewNodeId = node.id">
                    <Icon color="primary">
                      info
                    </Icon>
                  </VBtn>
                  <VBtn v-if="node.kind === 'topic'" icon @click.stop="targetNodeId = node.id">
                    <Icon>keyboard_arrow_right</Icon>
                  </VBtn>
                </VCardActions>
              </div>
            </VLayout>
          </VCard>
        </VContainer>
      </VContent>
      <ResourceDrawer
        app
        :nodeId="previewNodeId"
        :channelId="currentChannel.id"
        @close="previewNodeId = null"
      />

      <!-- footer buttons -->
      <BottomToolBar color="white" flat clipped-right app>
        <Icon class="mr-2">
          assignment
        </Icon>
        <ActionLink
          :text="$tr('copyClipboard')"
          data-test="clipboard"
          @click="copyToClipboard"
        />
        <VSpacer />
        <VBtn flat exact data-test="cancel" @click="dialog=false">
          {{ $tr("cancel") }}
        </VBtn>
        <VBtn
          color="primary"
          data-test="move"
          :disabled="currentLocationId === targetNodeId"
          @click="moveNodes"
        >
          {{ $tr("moveHere") }}
        </VBtn>
      </BottomToolBar>

      <NewTopicModal
        v-if="showNewTopicModal"
        v-model="showNewTopicModal"
        data-test="newtopicmodal"
        @createTopic="createTopic"
      />
    </VCard>
  </VDialog>

</template>
<script>

  import { mapGetters, mapActions, mapMutations, mapState } from 'vuex';
  import { RouterNames } from '../constants';
  import BottomToolBar from '../../shared/views/BottomToolBar';
  import ResourceDrawer from '../components/ResourceDrawer';
  import NewTopicModal from './NewTopicModal';
  import ActionLink from 'shared/views/ActionLink';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import LoadingText from 'shared/views/LoadingText';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'MoveModal',
    components: {
      NewTopicModal,
      BottomToolBar,
      ActionLink,
      Breadcrumbs,
      LoadingText,
      ResourceDrawer,
      Thumbnail,
      ToolBar,
    },
    data() {
      return {
        showNewTopicModal: false,
        loading: false,
        targetNodeId: null,
        previewNodeId: null,
      };
    },
    computed: {
      ...mapState('contentNode', { moveNodeIds: 'moveNodes' }),
      ...mapGetters('currentChannel', ['currentChannel', 'rootId']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeChildren',
        'getTreeNode',
        'getContentNodeAncestors',
      ]),
      dialog: {
        get() {
          return Boolean(this.moveNodeIds.length);
        },
        set(value) {
          if (!value) {
            this.setMoveNodes([]);
          }
        },
      },
      currentLocationId() {
        let treeNode = this.getTreeNode(this.moveNodeIds[0]);
        return treeNode && treeNode.parent;
      },
      currentNode() {
        return this.getContentNode(this.targetNodeId);
      },
      children() {
        return this.getContentNodeChildren(this.targetNodeId);
      },
      crumbs() {
        return this.getContentNodeAncestors(this.targetNodeId) || [];
      },
    },
    watch: {
      targetNodeId() {
        this.previewNodeId = null;
        this.$nextTick(() => {
          this.getChildren();
        });
      },
    },
    created() {
      this.targetNodeId = this.currentLocationId || this.rootId;
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode', 'loadChildren', 'moveContentNodes']),
      ...mapActions('clipboard', ['copyAll']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      isDisabled(node) {
        return this.moveNodeIds.includes(node.id);
      },
      openTopic(node) {
        if (node.kind === 'topic') {
          this.targetNodeId = node.id;
        }
      },
      goToLocation() {
        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.targetNodeId,
          },
        });
      },
      getChildren() {
        if (this.currentNode && this.currentNode.has_children) {
          this.loading = true;
          return this.loadChildren({
            parent: this.targetNodeId,
            tree_id: this.rootId,
          }).then(() => {
            this.loading = false;
          });
        }
        return Promise.resolve();
      },
      createTopic(title) {
        this.createContentNode({ parent: this.targetNodeId, kind: 'topic', title }).then(() => {
          this.showNewTopicModal = false;
          this.$store.dispatch('showSnackbar', { text: this.$tr('topicCreatedMessage') });
        });
      },
      copyToClipboard() {
        this.copyAll({ id__in: this.moveNodeIds }).then(() => {
          this.$router.push(this.closeLink);
          this.$store.dispatch('showSnackbar', { text: this.$tr('copiedToClipboardMessage') });
        });
      },
      moveNodes() {
        this.moveContentNodes({ id__in: this.moveNodeIds, parent: this.targetNodeId }).then(() => {
          this.dialog = false;
          this.$store.dispatch('showSnackbar', {
            text: this.$tr('movedMessage', { title: this.currentNode.title }),
            actionText: this.$tr('goToLocationButton'),
            actionCallback: this.goToLocation,
          });
        });
      },
    },
    $trs: {
      copyClipboard: 'Or copy to clipboard',
      moveItems: 'Moving {count, plural,\n =1 {# selection}\n other {# selections}} into:',
      addTopic: 'Add new topic',
      cancel: 'Cancel',
      moveHere: 'Move here',
      resourcesCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      emptyTopicText: 'No resources found',
      topicCreatedMessage: 'New topic created',
      copiedToClipboardMessage: 'Copied to clipboard',
      movedMessage: 'Moved to {title}',
      goToLocationButton: 'Go to location',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-toolbar__extension {
    padding: 0;
  }

  .content-card {
    border-bottom: 1px solid var(--v-grey-lighten3) !important;
    .options {
      display: none;
    }
    &.disabled {
      pointer-events: none;
    }
    &:last-child {
      border-bottom: 0 !important;
    }
    &:hover {
      background-color: var(--v-grey-lighten4);
      .options {
        display: block;
      }
    }
  }

</style>
