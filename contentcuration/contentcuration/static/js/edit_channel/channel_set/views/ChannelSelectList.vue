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
      <div class="container-fluid" v-else>
        <div class="channelCountText">
          {{ $tr("publishedChannelCount", {"channelCount": channels.length}) }}
        </div>
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
import { ChannelListNames } from '../constants';

export default {
  name: 'ChannelSelectList',
  $trs: {
    [ChannelListNames.EDIT]: "My Channels",
    [ChannelListNames.VIEW_ONLY]: "View Only Channels",
    [ChannelListNames.PUBLIC]: "Public Channels",
    channelLoadingText: "Loading...",
    noChannelsText: "No channels found",
    publishedChannelCount: "Showing {channelCount, plural, =1 {# published channel} other {# published channels}}"
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
  .channelCountText {
    font-size: 12pt;
    color: @gray-500;
    font-weight: bold;
  }
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
