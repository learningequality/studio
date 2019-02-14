<template>

  <div class="channel-list">
    <div v-if="canAddChannels" class="new-button">
      <a class="action-button" :title="$tr('addChannel')">
        <span class="material-icons align-text-top">add</span> {{ $tr('channel') }}
      </a>
    </div>


    <div v-if="loading" class="default-item">
      {{ $tr('loading') }}
    </div>
    <div v-else-if="listChannels && !listChannels.length" class="default-item">
      {{ $tr('noChannelsFound') }}
    </div>
    <div v-else>
      <ChannelItem
        v-for="channel in listChannels"
        :key="channel.id"
        :channel="channel"
      />
    </div>
  </div>

</template>


<script>

import _ from 'underscore';
import { mapState, mapActions } from 'vuex';
import ChannelItem from './ChannelItem.vue';

export default {
  name: 'ChannelList',
  $trs: {
    loading: "Loading channels...",
    noChannelsFound: "No channels found",
    channel: "Channel",
    addChannel: "Create a new channel"
  },
  props: {
    listType: {
      type: String,
      required: true
    },
    canAddChannels: {
      type: Boolean
    }
  },
  data() {
    return {
      loading: true
    }
  },
  mounted() {
    this.loadChannelList(this.listType).then(() => {
      this.loading = false;
    });
  },
  components: {
    ChannelItem,
  },
  computed: Object.assign(
    mapState('channel_list', [
      'channels'
    ]),
    {
      listChannels() {
        return _.where(this.channels, {[this.listType]: true});
      }
    }
  ),
  methods: Object.assign(
    mapActions('channel_list', [
      'loadChannelList'
    ])
  ),
};

</script>


<style lang="less" scoped>


</style>
