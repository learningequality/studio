<template>

  <Uploader @uploading="createNodesFromFiles">
    <template slot="upload-zone">
      <VList width="100%">
        <!-- Select all checkbox -->
        <VListTile @click="toggleSelectAll">
          <VListTileAction>
            <VCheckbox
              color="primary"
              :inputValue="selectAllChecked"
              @click.stop="toggleSelectAll"
            />
          </VListTileAction>
          <VListTileContent>
            <VListTileTitle>{{ $tr('selectAllLabel') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
      </VList>
      <VList width="100%" two-line>
        <!-- Selected items -->
        <EditListItem
          v-for="(node, index) in nodes"
          :key="node.id"
          :index="index"
          :removable="allowRemove"
        />
      </VList>
    </template>
  </Uploader>

</template>

<script>

  import { mapMutations, mapState } from 'vuex';
  import EditListItem from './EditListItem.vue';
  import Uploader from 'edit_channel/sharedComponents/Uploader.vue';

  export default {
    name: 'EditList',
    components: {
      EditListItem,
      Uploader,
    },
    props: {
      allowRemove: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectAllChecked: false,
      };
    },
    computed: {
      ...mapState('edit_modal', ['nodes']),
    },
    methods: {
      ...mapMutations('edit_modal', {
        selectAll: 'SELECT_ALL_NODES',
        deselectAll: 'RESET_SELECTED',
        createNodesFromFiles: 'ADD_NODES_FROM_FILES',
      }),
      toggleSelectAll() {
        this.selectAllChecked ? this.deselectAll() : this.selectAll();
        this.selectAllChecked = !this.selectAllChecked;
      },
    },
    $trs: {
      selectAllLabel: 'Select All',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-list {
    width: 100%;
    /deep/ a,
    /deep/ a:hover {
      color: inherit;
      text-decoration: none;
    }
  }

</style>
