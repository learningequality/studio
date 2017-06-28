<template>

  <ul class="list-unstyled import-list modal-list-default">
    <ImportListItem
      v-for="channel in channels"
      :key="channel.id"
      :node="channel"
      :isFolder="true"
      :isChannel="true"
      :childDataFetcher="store.fetchContentNodesById"
      :parentIsChecked="false"
      :store="store"
    />
  </ul>

</template>


<script>

  module.exports = {
    props: {
      channels: {
        type: Array,
        required: true,
      },
      store: {
        type: Object,
        required: true,
      },
    },
    components: {
      ImportListItem: require('./ImportListItem.vue'),
    },
  };

</script>


<style lang="less" scoped>

</style>
