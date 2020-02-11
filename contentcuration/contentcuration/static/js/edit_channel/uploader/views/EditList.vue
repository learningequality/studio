<template>

  <VList two-line>
    <!-- Select all checkbox -->
    <VCheckbox
      v-model="selectAll"
      color="primary"
      hide-details
      class="mt-0 mb-2 pa-2"
      :label="$tr('selectAllLabel')"
    />
    <VDivider />
    <EditListItem
      v-for="nodeId in nodeIds"
      :key="nodeId"
      v-model="selected"
      :nodeId="nodeId"
      :removable="canEdit"
    />

  </VList>

</template>

<script>

  import { mapGetters } from 'vuex';
  import EditListItem from './EditListItem.vue';

  export default {
    name: 'EditList',
    components: {
      EditListItem,
    },
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      selected: {
        get() {
          return this.value;
        },
        set(items) {
          this.$emit('input', items);
        },
      },
      selectAll: {
        get() {
          return this.nodeIds.every(nodeId => this.selected.includes(nodeId));
        },
        set(value) {
          if (value) {
            this.selected = this.nodeIds;
          } else {
            this.selected = [];
          }
        },
      },
    },
    $trs: {
      selectAllLabel: 'Select All',
    },
  };

</script>

<style lang="less" scoped>

  .v-divider {
    margin-top: 0;
  }

</style>
