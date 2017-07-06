<template>

  <div>
    <div v-if="channelsAreLoading">
      Channels are loading...
    </div>
    <div v-else-if="channels.length === 0">
      No Channels available to import from
    </div>

    <ul v-else class="Channels">
      <ImportListItem
        v-for="channel in channels"
        :key="channel.id"
        :node="channel"
        :isRoot="true"
        :isFolder="true"
        :isChannel="true"
        :parentIsChecked="false"
      />
    </ul>
  </div>

</template>


<script>

const { mapState } = require('vuex');

module.exports = {
  components: {
    ImportListItem: require('./ImportListItem.vue'),
  },
  computed: {
    ...mapState('import', [
      'channels',
      'channelsAreLoading',
    ]),
  },
};

</script>


<style lang="less" scoped>

@import '../../../../less/global-variables.less';

.Channels {
  height: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  border-left: 2px solid @blue-500;
  width: 100%;
}

</style>
