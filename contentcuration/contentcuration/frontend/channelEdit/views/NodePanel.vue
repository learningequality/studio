<template>

  <LoadingText v-if="loading" />
  <VLayout
    v-else-if="node && !node.total_count"
    justify-center
    fill-height
    style="padding-top: 10%;"
  >
    <VFlex v-if="isRoot" class="text-xs-center">
      <h1 class="headline font-weight-bold mb-2">
        {{ $tr('emptyChannelText') }}
      </h1>
      <p class="subheading">
        {{ $tr('emptyChannelSubText') }}
      </p>
    </VFlex>
    <VFlex v-else class="subheading text-xs-center">
      {{ $tr('emptyTopicText') }}
    </VFlex>
  </VLayout>
  <VLayout v-else row wrap>
    <VFlex
      v-if="node"
      xs12
    >
      <template
        v-for="child in children"
      >
        <VLayout :key="child.id" row wrap>
          <VFlex xs11>
            <router-link :to="treeLink(child)">
              <ContentNodeIcon :kind="child.kind" />
              <span>{{ child.title }}</span>
            </router-link>
          </VFlex>
          <VFlex xs1>
            <VBtn icon :to="editNodeLink(child.id)">
              <VIcon>edit</VIcon>
            </VBtn>
          </VFlex>
        </VLayout>
      </template>
    </VFlex>
  </VLayout>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'NodePanel',
    components: {
      ContentNodeIcon,
      LoadingText,
    },
    props: {
      parentId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'rootId']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren']),
      node() {
        return this.getContentNode(this.parentId);
      },
      children() {
        return this.getContentNodeChildren(this.parentId);
      },
      isRoot() {
        return this.rootId === this.parentId;
      },
    },
    mounted() {
      if (this.node && this.node.total_count && !this.children.length) {
        this.loading = true;
        this.loadChildren({ parent: this.parentId, channel_id: this.currentChannel.id }).then(
          () => {
            this.loading = false;
          }
        );
      }
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren']),
      editNodeLink(id) {
        return {
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            nodeId: this.parentId,
            detailNodeIds: id,
          },
        };
      },
      treeLink(node) {
        if (node.kind === 'topic') {
          return {
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: node.id,
            },
          };
        }
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.parentId,
            detailNodeId: node.id,
          },
        };
      },
    },
    $trs: {
      emptyTopicText: 'Nothing in this topic yet',
      emptyChannelText: 'Click "ADD" to start building your channel',
      emptyChannelSubText: 'Create, upload, or find resources from other channels',
    },
  };

</script>

<style scoped>
</style>
