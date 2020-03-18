<template>

  <VDialog
    :value="Boolean(currentNode)"
    fullscreen
    scrollable
    app
    persistent
  >
    <VCard>
      <VToolbar
        dark
        color="primary"
        app
        :extended="!loading"
        :extension-height="48"
        flat
      >
        <VBtn icon :to="closeLink" exact>
          <Icon>close</Icon>
        </VBtn>
        <VToolbarTitle>
          {{ $tr("moveItems", {count: moveNodesCount}) }}
          <b class="notranslate">{{ currentNode.title }}</b>
        </VToolbarTitle>
        <template v-if="!loading" #extension>
          <VToolbar dense flat color="white" light>
            <Breadcrumbs :items="crumbs">
              <template #item="{item}">
                <span class="notranslate">{{ item.text }}</span>
              </template>
            </Breadcrumbs>
            <VSpacer />
            <VBtn flat @click="showNewTopicModal = true">
              {{ $tr("addTopic") }}
            </VBtn>
          </VToolbar>
        </template>
      </VToolbar>
      <VContent style="padding-top: 112px; padding-bottom: 64px; background-color: white;">

        <!-- list of children content -->
        <LoadingText v-if="loading" absolute />
        <VContainer v-else-if="!children.length" fluid fill-height>
          <VLayout align-center justify-center class="subheading">
            <div>{{ $tr('emptyTopicText') }}</div>
          </VLayout>
        </VContainer>
        <VContainer v-else fluid align-content-start class="pa-0">
          <VCard
            v-for="node in children"
            :key="node.id"
            flat
            class="pa-4 content-card"
            :to="node.kind === 'topic'? nextItem(node) : undefined"
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
                  <div>{{ $tr('resourcesCount', {count: node.resource_count}) }}</div>
                  <div class="notranslate subheading">
                    {{ node.description }}
                  </div>
                </VCardText>
              </VFlex>
              <VSpacer />
              <div style="min-width: 102px;">
                <VCardActions class="options">
                  <VBtn icon @click.stop="previewNodeId = node.id">
                    <Icon color="primary">
                      info
                    </Icon>
                  </VBtn>
                  <VBtn v-if="node.kind === 'topic'" icon :to="nextItem(node)">
                    <Icon>keyboard_arrow_right</Icon>
                  </VBtn>
                </VCardActions>
              </div>
            </VLayout>
          </VCard>
        </VContainer>
      </VContent>
      <ResourceDrawer
        localName="move-resource-panel"
        :nodeId="previewNodeId"
        @close="previewNodeId = null"
      />

      <!-- footer buttons -->
      <BottomToolBar color="white" flat clipped-right app>
        <Icon class="mr-2">
          assignment
        </Icon>
        <ActionLink :text="$tr('moveClipboard')" @click="moveNodesToClipboard" />
        <VSpacer />
        <VBtn flat :to="closeLink" exact>
          {{ $tr("cancel") }}
        </VBtn>
        <VBtn color="primary" class="white--text" @click="moveNodes">
          {{ $tr("moveHere") }}
        </VBtn>
      </BottomToolBar>

      <NewTopicModal
        v-model="showNewTopicModal"
        @createTopic="createTopic"
      />
    </VCard>
  </VDialog>

</template>
<script>

  import { mapGetters, mapActions } from 'vuex';
  import { RouterNames } from '../constants';
  import BottomToolBar from '../../shared/views/BottomToolBar';
  import ResourceDrawer from '../components/ResourceDrawer';
  import NewTopicModal from './NewTopicModal';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import LoadingText from 'shared/views/LoadingText';
  import Thumbnail from 'shared/views/files/Thumbnail';

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
    },
    props: {
      targetNodeId: {
        type: String,
        required: true,
      },
      moveNodeIds: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showNewTopicModal: false,
        loading: false,
        previewNodeId: null,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren', 'getTreeNode']),
      closeLink() {
        return {
          name: this.$route.matched[this.$route.matched.length - 2].name,
          params: this.$route.params,
        };
      },
      currentNode() {
        return this.getContentNode(this.targetNodeId);
      },
      moveNodesCount() {
        return this.moveNodeIds.split(',').length;
      },
      children() {
        return this.getContentNodeChildren(this.targetNodeId);
      },
      crumbs() {
        const trail = [];
        var node = this.getContentNode(this.targetNodeId);
        var inTree = this.getTreeNode(node.id);
        trail.unshift({
          text: node.title,
          to: this.nextItem(node),
        });
        while (inTree !== undefined) {
          node = this.getContentNode(inTree.parent);
          inTree = this.getTreeNode(node.id);
          trail.unshift({
            text: node.title,
            to: this.nextItem(node),
          });
        }
        return trail;
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
      if (!this.currentNode) {
        this.loadContentNode(this.targetNodeId).then(this.getChildren);
        var node = this.getContentNode(this.targetNodeId);
        while (node.parent !== null) {
          this.loadContentNode(node.parent).then(() => {
            node = this.getContentNode(node.parent);
          });
        }
      } else {
        this.getChildren();
      }
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode', 'loadContentNode', 'loadChildren']),
      nextItem(child) {
        return {
          name: RouterNames.MOVE,
          params: {
            ...this.$route.params,
            targetNodeId: child.id,
          },
        };
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
            channel_id: this.currentChannel.id,
          }).then(() => {
            this.loading = false;
          });
        }
        return Promise.resolve();
      },
      createTopic(title) {
        this.createContentNode({ parent: this.nodeId, kind: 'topic', title }).then(() => {
          this.showNewTopicModal = false;
          this.$store.dispatch('showSnackbar', { text: this.$tr('topicCreatedMessage') });
        });
      },
      moveNodesToClipboard() {
        // TODO: connect to vuex action
        this.$store.dispatch('showSnackbar', { text: this.$tr('movedToClipboardMessage') });
      },
      moveNodes() {
        // TODO: connect to vuex action
        this.$store.dispatch('showSnackbar', {
          text: this.$tr('movedMessage', { title: this.currentNode.title }),
          actionText: this.$tr('goToLocationButton'),
          actionCallback: this.goToLocation,
        });
      },
    },
    $trs: {
      moveClipboard: 'Or move to clipboard',
      moveItems: 'Moving {count, plural,\n =1 {# selection}\n other {# selections}} into:',
      addTopic: 'Add new topic',
      cancel: 'Cancel',
      moveHere: 'Move here',
      resourcesCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      emptyTopicText: 'No resources found',
      topicCreatedMessage: 'New topic created',
      movedToClipboardMessage: 'Moved to clipboard',
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
