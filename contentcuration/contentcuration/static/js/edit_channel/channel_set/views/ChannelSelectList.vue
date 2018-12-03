<template>
  <div class="channelList">
    <div class="channelListHeader uppercase" @click="toggleChannelList">
      {{translateName}}
      <span class="toggler material-icons">{{togglerClass}}</span>
    </div>
    <div v-show="isExpanded" class="channelListContent">
      <em v-if="isLoading" class="default-item">
        {{ $tr('channelLoadingText') }}
      </em>
      <div v-else-if="channels.length === 0" class="default-item">
        {{ $tr('noChannelsText') }}
      </div>
      <div class="container-fluid">
        <ChannelItem
          v-for="channel in channels"
          :key="channel.id"
          :channel="channel"
        />
      </div>
    </div>
  </div>

</template>


<script>

import { mapGetters, mapActions } from 'vuex';
import ChannelItem from './ChannelItem.vue';

export default {
  name: 'ChannelSelectList',
  $trs: {
    EDIT: "My Channels",
    VIEW_ONLY: "View Only Channels",
    PUBLIC: "Public Channels",
    channelLoadingText: "Loading...",
    noChannelsText: "No channels found",

  },
  props: {
    listName: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isExpanded: false,
      channels: [],
      isLoading: false,
    }
  },
  components: {
    ChannelItem,
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'allChannels',
    ]),
    {

      translateName() {
        return this.$tr(this.listName);
      },
      idName() {
        return "#" + this.listName;
      },
      togglerClass() {
        return (this.isExpanded)? 'arrow_drop_down': 'arrow_drop_up';
      },
    }
  ),
  methods: Object.assign(
    mapActions('channel_set', [
      'loadChannelList'
    ]),
    {
      fetchChannels() {
        if (this.allChannels.hasOwnProperty(this.listName)) {
          this.isLoading = false;
          this.channels = this.allChannels[this.listName];
        } else {
          this.isLoading = true;
          this.loadChannelList(this.listName)
          .then((channelData) => {
            this.isLoading = false;
            this.channels = channelData;
          });
        }
      },
      toggleChannelList() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
          this.fetchChannels();
        }
      },
    }
  )
};

</script>


<style lang="less" scoped>

@import '../../../../less/global-variables.less';
  .channelList {
    margin-bottom: 10px;
    .channelListHeader {
      cursor: pointer;
      background-color: @blue-200;
      padding: 5px 15px;
      font-size: 14pt;
      color: white;
      font-weight: bold;
      .toggler {
        vertical-align: sub;
      }
    }
    .channelListContent {
      padding: 15px 0px;
    }
  }

  /deep/ .selectedChannel {
    background-color: @blue-000;
  }

</style>
