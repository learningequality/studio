<template>

  <VList two-line class="pl-3">
    <EditListItem
      :key="nodeId"
      v-model="selected"
      :nodeId="nodeId"
      @input="trackSelect"
      @removed="handleRemoved"
    />
    <div v-if="getChildren !== undefined">
      <EditListItems
        v-for="childId in getChildren"
        :key="childId"
        v-model="selected"
        :nodeId="childId"
        :nodes="nodes"
        :nodeIds="nodeIds"
        @input="trackSelect"
        @removed="handleRemoved"
      />
    </div>
  </VList>

</template>

<script>

  import EditListItem from './EditListItem';

  export default {
    name: 'EditListItems',
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
      nodeId: {
        type: String,
        require: true,
        default: null,
      },
      nodes: {
        type: Object,
        default: () => {},
      },
    },
    computed: {
      selected: {
        get() {
          return this.value;
        },
        set(items) {
          this.$emit('input', items);
        },
      },
      getChildren() {
        const childrens = [];
        Object.keys(this.nodes).forEach(nodeId => {
          if (this.nodes[nodeId] === this.nodeId) {
            childrens.push(nodeId);
          }
        });
        return childrens;
      },
    },
    methods: {
      handleRemoved(nodeId) {
        this.$emit('removed', nodeId);
      },
      trackSelect(value) {
        this.$emit('input', value);
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-divider {
    margin-top: 0;
  }

</style>
