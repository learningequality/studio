<template>

  <ul class="modal-list-default">
    <ImportListItem
      v-for="channel in channels"
      :key="channel.id"
      :node="channel"
      :isRoot="true"
      :isFolder="true"
      :isChannel="true"
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

  @import '../../../../less/global-variables.less';

  .import-channel-list {
    padding-left: 0;
    list-style: none;
    height: auto;
    margin: 0px;
    padding: 0px;
    border-left: 2px solid @blue-500;
    width: -moz-max-content;
    width: -webkit-max-content;
    width: max-content;
  }

</style>
