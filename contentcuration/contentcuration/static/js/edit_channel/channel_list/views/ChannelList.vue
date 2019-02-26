<template>

  <div class="channel-list">
    <div v-if="canAddChannels" class="new-button">
      <button class="action-button" :title="$tr('addChannel')" @click="createChannel">
        <span class="material-icons align-text-top">add</span> {{ $tr('channel') }}
      </button>
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
import State from 'edit_channel/state';
import { setChannelMixin } from './../mixins';

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
  mixins: [setChannelMixin],
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
    ]),
    {
      createChannel() {
        let preferences = (typeof window.user_preferences === "string")? JSON.parse(window.user_preferences) : window.user_preferences;
        let newChannel = {
          name: "",
          description: "",
          editors: [State.current_user.id],
          pending_editors: [],
          language: preferences.language,
          content_defaults: preferences,
          thumbnail: "",
          thumbnail_encoding: {}
        };
        this.setChannel(newChannel);
      }
    }

  ),
};

</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

</style>
