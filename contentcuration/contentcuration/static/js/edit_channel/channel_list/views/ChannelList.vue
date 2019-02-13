<template>

  <div class="channel-list">
    <div v-if="canAddChannels" class="new-channel">
      <a class="action-button" :title="$tr('addChannel')">
        <span class="material-icons align-text-top">add</span> {{ $tr('channel') }}
      </a>
    </div>


    <div v-if="loading" class="default-item">
      {{ $tr('loading') }}
    </div>
    <div v-else-if="channelCount === 0" class="default-item">
      {{ $tr('noChannelsFound') }}
    </div>
    <div v-else>
      <div>{{listChannels.length}}</div>
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
      },
      channelCount() {
        return this.listChannels && this.listChannels.length || 0;
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

@import '../../../../less/channel_list.less';

.default-item {
  margin-top: 100px;
  color: @gray-500;
  font-size: 16pt;
  font-style: italic;
  font-weight: bold;
  text-align: center;
}

.channel-list {
  width: @channel-item-width;
  max-width: @channel-item-max-width + 50px;
  min-width: @channel-item-min-width + 50px;
  margin: 50px auto;
}

.new-channel {
  text-align: right;
  margin-bottom: 30px;
  padding: 0px 50px;
  a {
    font-size: 14pt;
    span {
      font-size: 18pt;
    }
  }
}

</style>
