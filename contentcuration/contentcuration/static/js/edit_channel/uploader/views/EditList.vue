<template>
  <VNavigationDrawer v-model="drawer.open" stateless clipped app class="edit-list">
    <VList>
      <!-- Select all checkbox -->
      <VListTile @click="toggleSelectAll">
        <VListTileAction>
          <VCheckbox color="primary" :value="selectAllChecked" />
        </VListTileAction>
        <VListTileContent>
          <VListTileTitle>{{ $tr('selectAllLabel') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VDivider />

      <!-- Selected items -->
      <EditListItem v-for="(node, index) in nodes" :key="node.id" :index="index" />
    </VList>
  </VNavigationDrawer>
</template>

<script>

  import { mapGetters, mapMutations } from 'vuex';
  import EditListItem from './EditListItem.vue';

  export default {
    name: 'EditList',
    $trs: {
      selectAllLabel: 'Select All',
    },
    components: {
      EditListItem,
    },
    data() {
      return {
        selectAllChecked: false,
        drawer: {
          open: true,
        },
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['nodes']),
    },
    methods: {
      ...mapMutations('edit_modal', {
        selectAll: 'SELECT_ALL_NODES',
        deselectAll: 'RESET_SELECTED',
      }),
      toggleSelectAll() {
        this.selectAllChecked ? this.deselectAll() : this.selectAll();
        this.selectAllChecked = !this.selectAllChecked;
      },
      openDrawer() {
        this.drawer.open = true;
      },
    },
  };

</script>

<style lang="less" scoped>

</style>
