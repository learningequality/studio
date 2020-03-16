<template>

  <VDialog
    :value="true"
    fullscreen
    scrollable
    app
    width="500"
    persistent
  >
    <VCard>
      <VToolbar dark color="primary">
        <VBtn icon @click="$emit('cancelMove')">
          <Icon>close</Icon>
        </VBtn>
        <VToolbarTitle>
          {{ $tr("moveItems", {count: 2}) }}
          <b class="notranslate">{{ currentNode.title }}</b>
        </VToolbarTitle>
        <VSpacer />
      </VToolbar>
      <!-- header items -->
      <VLayout wrap>
        <VFlex md8 justify-start>
          <Breadcrumbs :items="crumbs">
            <template #item="{item}">
              {{ item.title }}
            </template>
          </Breadcrumbs>
        </VFlex>
        <VSpacer />
        <VFlex shrink>
          <VBtn flat @click="showNewTopicModal = true">
            {{ $tr("addTopic") }}
          </VBtn>
        </VFlex>
      </VLayout>
      <!-- list of children content -->
      <VCard v-for="node in children" :key="node.id">
        <VLayout class="card">
          <VFlex xs2 align-self-center>
            <!-- TODO: Add the appropriate thumbnail or card -->
            <VImg
              src="https://cdn.vuetifyjs.com/images/cards/foster.jpg"
              height="68px"
              contain
            />
          </VFlex>
          <VFlex xs8 align-self-center>
            <VCardTitle primary-title>
              <div class="headline notranslate">
                {{ node.title }}
              </div>
              <div>{{ $tr('resourcesCount', {count: node.resource_count}) }}</div>
              <div class="description notranslate">
                {{ node.description }}
              </div>
            </VCardTitle>
          </VFlex>
          <VFlex align-self-center>
            <VCardActions>
              <VBtn icon>
                <Icon small color="primary">
                  info
                </Icon>
              </VBtn>
              <VBtn v-if="node.kind === 'topic'" icon :to="nextItem(node)">
                <Icon>keyboard_arrow_right</Icon>
              </VBtn>
            </VCardActions>
          </VFlex>
        </VLayout>
      </VCard>

      <!-- footer buttons -->
      <BottomToolBar color="white" flat>
        <Icon class="mr-2">
          assignment
        </Icon>
        <ActionLink :text="$tr('moveClipboard')" />
        <VSpacer />
        <VBtn flat @click="$emit('cancelMove')">
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
  import NewTopicModal from './NewTopicModal';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import Breadcrumbs from 'shared/views/Breadcrumbs';

  export default {
    name: 'MoveModal',
    components: {
      NewTopicModal,
      BottomToolBar,
      ActionLink,
      Breadcrumbs,
    },
    props: {
      targetNodeId: {
        type: String,
        required: true,
      },
      // moveNodeIds: {
      //   type: String,
      //   required: true,
      // },
    },
    data() {
      return {
        showNewTopicModal: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren', 'getTreeNode']),
      currentNode() {
        return this.getContentNode(this.targetNodeId);
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
          disabled: false,
          to: this.nextItem(node),
        });
        while (inTree !== undefined) {
          node = this.getContentNode(inTree.parent);
          inTree = this.getTreeNode(node.id);
          trail.unshift({
            text: node.title,
            disabled: false,
            to: this.nextItem(node),
          });
        }
        return trail;
      },
    },
    created() {
      if (!this.currentNode) {
        this.loadContentNode(this.nodeId).then(this.getChildren);
        var node = this.getContentNode(this.nodeId);
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
      getChildren() {
        if (this.currentNode && this.currentNode.total_count) {
          return this.loadChildren({
            parent: this.currentChannel,
            channel_id: this.currentChannel.id,
          });
        }
        return Promise.resolve();
      },
      createTopic(title) {
        this.createContentNode({ parent: this.nodeId, kind: 'topic', title }).then(() => {
          this.showNewTopicModal = false;
        });
      },
      moveNodes() {
        // TODO: connect to vuex action
      },
    },
    $trs: {
      moveClipboard: 'Or move to clipboard',
      moveItems: 'Moving {count, plural,\n =1 {# selection}\n other {# selections}} into:',
      addTopic: 'Add new topic',
      cancel: 'Cancel',
      moveHere: 'Move here',
      resourcesCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
    },
  };

</script>

<style lang="less" scoped>

  .list {
    border: 1px solid rgb(192, 192, 192);
  }

  .card {
    max-height: 118px;
  }

  .card:hover {
    background: #eeeeee;
  }

  .description {
    width: 539px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

</style>
