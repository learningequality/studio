<template>

  <LoadingText v-if="loading" />
  <VLayout
    v-else-if="node && !node.total_count"
    class="pa-4"
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
  <VList
    v-else
    class="node-list"
    shrink
    :style="{backgroundColor: $vuetify.theme.backgroundColor}"
  >
    <template
      v-for="child in children"
    >
      <ContentNodeListItem
        :key="child.id"
        :nodeId="child.id"
        :compact="isCompactViewMode"
        :select="selected.indexOf(child.id) >= 0"
        @select="$emit('select', child.id)"
        @deselect="$emit('deselect', child.id)"
      />
    </template>
  </VList>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import LoadingText from 'shared/views/LoadingText';
  import ContentNodeListItem from 'frontend/channelEdit/views/list/ContentNodeListItem';

  export default {
    name: 'NodePanel',
    components: {
      ContentNodeListItem,
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
    },
    $trs: {
      emptyTopicText: 'Nothing in this topic yet',
      emptyChannelText: 'Click "ADD" to start building your channel',
      emptyChannelSubText: 'Create, upload, or find resources from other channels',
    },
  };

</script>

<style scoped>
  .node-list {
    width: 100%;
    padding: 0;
    padding-bottom: 100px;
    overflow-y: auto;
  }
</style>
