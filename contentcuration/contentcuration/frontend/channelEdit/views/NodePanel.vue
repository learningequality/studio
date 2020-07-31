<template>

  <LoadingText v-if="loading" />
  <VLayout
    v-else-if="node && !node.total_count"
    class="pa-4"
    justify-center
    fill-height
    style="padding-top: 10%;"
  >
    <VFlex v-if="isRoot && canEdit" class="text-xs-center">
      <h1 class="headline font-weight-bold mb-2">
        {{ $tr('emptyChannelText') }}
      </h1>
      <p class="subheading">
        {{ $tr('emptyChannelSubText') }}
      </p>
    </VFlex>
    <VFlex v-else-if="isRoot" class="subheading text-xs-center">
      {{ $tr('emptyViewOnlyChannelText') }}
    </VFlex>
    <VFlex v-else class="subheading text-xs-center">
      {{ $tr('emptyTopicText') }}
    </VFlex>
  </VLayout>
  <VList
    v-else
    class="node-list"
    shrink
    :style="{backgroundColor: $vuetify.theme.backgroundColor}"
  >
    <template
      v-for="child in children"
    >
      <ContentNodeEditListItem
        :key="child.id"
        :nodeId="child.id"
        :compact="isCompactViewMode"
        :select="selected.indexOf(child.id) >= 0"
        @select="$emit('select', child.id)"
        @deselect="$emit('deselect', child.id)"
        @infoClick="goToNodeDetail(child.id)"
        @topicChevronClick="goToTopic(child.id)"
        @dblclick.native="onNodeDoubleClick(child)"
      />
    </template>
  </VList>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';

  import { RouterNames } from '../constants';
  import ContentNodeEditListItem from '../components/ContentNodeEditListItem';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'NodePanel',
    components: {
      ContentNodeEditListItem,
      LoadingText,
    },
    props: {
      parentId: {
        type: String,
        required: true,
      },
      selected: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapGetters(['isCompactViewMode']),
      ...mapGetters('currentChannel', ['rootId', 'canEdit']),
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
        this.loadChildren({ parent: this.parentId, tree_id: this.rootId }).then(() => {
          this.loading = false;
        });
      }
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren']),
      goToNodeDetail(nodeId) {
        if (
          this.$route.params.nodeId === this.parentId &&
          this.$route.params.detailNodeId === nodeId
        ) {
          return;
        }

        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.parentId,
            detailNodeId: nodeId,
          },
        });
      },
      goToTopic(topicId) {
        if (this.$route.params.nodeId === topicId && !this.$route.params.detailNodeId) {
          return;
        }

        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: topicId,
            detailNodeId: null,
          },
        });
      },
      onNodeDoubleClick(node) {
        if (node.kind === ContentKindsNames.TOPIC) {
          this.goToTopic(node.id);
        } else {
          this.goToNodeDetail(node.id);
        }
      },
    },
    $trs: {
      emptyViewOnlyChannelText: 'Nothing in this channel yet',
      emptyTopicText: 'Nothing in this topic yet',
      emptyChannelText: 'Click "ADD" to start building your channel',
      emptyChannelSubText: 'Create, upload, or find resources from other channels',
    },
  };

</script>

<style scoped>
  .node-list {
    padding: 0;
    width: 100%;
  }
</style>
