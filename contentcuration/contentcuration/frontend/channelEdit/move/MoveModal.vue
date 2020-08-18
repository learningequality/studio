<template>

  <FullscreenModal v-model="dialog" lazy>
    <template #header>
      {{ $tr("moveItems", {count: moveNodeIds.length}) }}
      <b class="notranslate">{{ currentNode.title }}</b>
    </template>
    <ToolBar v-if="!loading" color="white" light>
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
      <VBtn color="grey lighten-4" data-test="newtopic" @click="showNewTopicModal = true">
        {{ $tr("addTopic") }}
      </VBtn>
    </ToolBar>
    <!-- list of children content -->
    <LoadingText v-if="loading" data-test="loading" />
    <VContainer
      v-else-if="!children.length"
      data-test="empty"
      class="pa-0"
      fluid
      fill-height
    >
      <VLayout align-center justify-center class="subheading">
        <div>{{ $tr('emptyTopicText') }}</div>
      </VLayout>
    </VContainer>
    <VContent
      v-else
      fluid
      align-content-start
      class="pb-5 mb-5"
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
    </VContent>
    <ResourceDrawer
      app
      style="margin-top: 64px;"
      :nodeId="previewNodeId"
      :channelId="currentChannel.id"
      @close="previewNodeId = null"
    />

    <!-- footer buttons -->
    <template #bottom>
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
    </template>

    <NewTopicModal
      v-if="showNewTopicModal"
      v-model="showNewTopicModal"
      data-test="newtopicmodal"
      @createTopic="createTopic"
    />
  </FullscreenModal>

</template>
<script>

  import { mapGetters, mapActions, mapMutations, mapState } from 'vuex';
  import { RouterNames } from '../constants';
  import ResourceDrawer from '../components/ResourceDrawer';
  import NewTopicModal from './NewTopicModal';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import LoadingText from 'shared/views/LoadingText';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ToolBar from 'shared/views/ToolBar';
  import FullscreenModal from 'shared/views/FullscreenModal';

  export default {
    name: 'MoveModal',
    components: {
      NewTopicModal,
      Breadcrumbs,
      LoadingText,
      ResourceDrawer,
      Thumbnail,
      ToolBar,
      FullscreenModal,
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
      moveItems: 'Moving {count, plural,\n =1 {# selection}\n other {# selections}} into:',
      addTopic: 'Add new topic',
      cancel: 'Cancel',
      moveHere: 'Move here',
      resourcesCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      emptyTopicText: 'No resources found',
      topicCreatedMessage: 'New topic created',
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
      opacity: 0.7;
    }
    &:not(.disabled) {
      cursor: pointer;
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
