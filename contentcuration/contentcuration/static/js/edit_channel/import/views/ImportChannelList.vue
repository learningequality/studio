<template>

  <div>
    <div v-if="channelsAreLoading">
    {{ $tr('channelLoadingText') }}
    </div>
    <div v-else-if="channels.length === 0">
      {{ $tr('noChannelsText') }}
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

import { mapState } from 'vuex';
import ImportListItem from './ImportListItem.vue';

export default {
  name: 'ImportChannelList',
  $trs: {
    'channelLoadingText': "Channels are loading...",
    'noChannelsText': "No channels available to import from"
  },
  components: {
    ImportListItem,
  },
  computed: mapState('import', [
    'channels',
    'channelsAreLoading',
  ]),
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
