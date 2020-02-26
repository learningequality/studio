<template>
  <VContainer grid-list-md>
    <NewTopicModal
      :showDialog="showNewTopicModal"
      @createTopic="createTopic"
      @cancelTopic="cancelTopic()"
    />

    <VLayout wrap>
      <VDialog v-model="showDialog" fullscreen width="500" persistent>
        <VToolbar dark color="primary">
          <VBtn icon dark @click="$emit('cancelMove')">
            <Icon>close</Icon>
          </VBtn>
          <VToolbar-title>
            <b>{{ $tr("moveItems", {x: 2, title: currentNode.title}) }}</b>
          </VToolbar-title>
          <VSpacer />
        </VToolbar>
        <VCard>
          <!-- header items -->
          <VLayout wrap>
            <VFlex md8 justify-start>
              <v-breadcrumbs :items="crumbs" divider=">" />
            </VFlex>
            <VSpacer />
            <VFlex shrink>
              <VBtn flat @click="showTopicModal()">
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
                  <div>
                    <div class="headline">
                      {{ node.title }}
                    </div>
                    <div>{{ $tr('resources', {x: node.resource_count}) }}</div>
                    <div class="description">
                      {{ node.description }}
                    </div>
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
            <Icon>assignment</Icon>
            <VBtn flat color="primary" class="button">
              {{ $tr("moveClipboard") }}
            </VBtn>
            <VSpacer />
            <VBtn flat @click="$emit('cancelMove')">
              {{ $tr("cancel") }}
            </VBtn>
            <VBtn color="primary" class="white--text" @click="moveNodes">
              {{ $tr("moveHere") }}
            </VBtn>
          </BottomToolBar>
        </VCard>
      </VDialog>
    </VLayout>
  </VContainer>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { RouterNames } from '../constants';
import BottomToolBar from '../../shared/views/BottomToolBar';
import NewTopicModal from './NewTopicModal';

export default {
  name: 'MoveModal',
  components: {
    NewTopicModal,
    BottomToolBar,
  },
  props: {
    nodeId: {
      type: String,
      required: true,
    },
    showDialog: {
      type: Boolean,
    },
  },
  data() {
    return {
      showNewTopicModal: false,
    };
  },
  computed: {
    ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren', 'getTreeNode']),
    currentNode() {
      return this.getContentNode(this.nodeId);
    },
    children() {
      return this.getContentNodeChildren(this.nodeId);
    },
    crumbs() {
      const trail = [];
      var node = this.getContentNode(this.nodeId);
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
        name: RouterNames.SANDBOX,
        params: {
          nodeId: child.id,
        },
      };
    },
    getChildren() {
      if (this.currentNode && this.currentNode.has_children) {
        return this.loadChildren({
          parent: this.nodeId,
          channel_id: this.$store.state.currentChannel.currentChannelId,
        });
      }
      return Promise.resolve();
    },
    showTopicModal() {
      this.showNewTopicModal = true;
    },
    cancelTopic() {
      this.showNewTopicModal = false;
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
    moveItems: 'Moving {x} selections into: {title}',
    addTopic: 'Add new topic',
    cancel: 'Cancel',
    moveHere: 'Move here',
    resources: '{x} resources',
  },
};
</script>

<style lang="less" scoped>
.button {
  text-transform: none;
  color: purple;
  text-decoration: underline;
}

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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
