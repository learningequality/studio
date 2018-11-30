<template>

  <div>
    <div id="backButton" class="container-fluid">
      <button class="btn btn-default pull-right" @click="goToViewChannels">
        {{ $tr('backButtonLabel') }}
      </button>
      <span class="channelCountText">{{ $tr('channelCountText', {'channelCount': channelCount}) }}</span>
    </div>

    <div id="channelListsWrapper">
      <ChannelSelectList
        v-for="channel in channelLists"
        :key="channel"
        :listName="channel"
        />
    </div>
  </div>

</template>



<script>

import { mapGetters, mapActions } from 'vuex';
import { ChannelListUrls } from '../constants';
import ChannelSelectList from './ChannelSelectList.vue';

export default {
  name: 'ChannelSelectView',
  $trs: {
    "backButtonLabel": "Back to Details",
    "channelCountText": "{channelCount, plural, =1 {# channel selected} other {# channels selected}}",
  },
  components: {
    ChannelSelectList
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'channels',
    ]),
    {
      channelLists() {
      return Object.keys(ChannelListUrls);
    },
      channelCount() {
        return this.channels.length;
      }
    }
  ),
  methods: Object.assign(
    mapActions('channel_set', [
      'goToViewChannels',
    ])
  )
};

</script>


<style lang="less" scoped>

@import '../../../../less/global-variables.less';

#backButton {
  margin-bottom: 20px;
}

</style>
