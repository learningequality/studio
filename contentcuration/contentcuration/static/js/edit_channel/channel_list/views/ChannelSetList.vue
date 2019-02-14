<template>

  <div class="channel-list">
    <div class="new-button">
      <a class="action-text" id="about-sets" @click="openAboutChannelSets">
        <span class="material-icons">info</span> {{ $tr('aboutChannelSets') }}
      </a>
      <a class="action-button" :title="$tr('addChannelSetTitle')">
        <span class="material-icons align-text-top">add</span> {{ $tr('addChannelSetButton') }}
      </a>
    </div>

    <div v-if="loading" class="default-item">
      {{ $tr('loading') }}
    </div>
    <div v-else-if="channelSets && !channelSets.length" class="default-item">
      {{ $tr('noChannelSetsFound') }}
    </div>
    <div v-else>
      <ChannelSetItem
        v-for="channelSet in channelSets"
        :key="channelSet.id"
        :channelSet="channelSet"
      />
    </div>
  </div>

</template>

<script>

import { mapGetters, mapActions } from 'vuex';
import ChannelSetItem from './ChannelSetItem.vue';
import { ChannelSetModalView } from 'edit_channel/information/views';

export default {
  name: 'ChannelSetList',
  $trs: {
    loading: "Loading collections...",
    noChannelSetsFound: "You can package together multiple Studio channels to create a collection." +
                        " Use a collection token to make multiple channels available for import at once in Kolibri!",
    addChannelSetTitle: "Create a new collection of channelsn",
    addChannelSetButton: "Collection",
    aboutChannelSets: "About Collections"
  },
  data() {
    return {
      loading: true
    }
  },
  mounted() {
    this.loadChannelSetList().then(() => {
      this.loading = false;
    });
  },
  components: {
    ChannelSetItem,
  },
  computed: Object.assign(
    mapGetters('channel_list', [
      'channelSets'
    ]),
    {
    }
  ),
  methods: Object.assign(
    mapActions('channel_list', [
      'loadChannelSetList'
    ]),
    {
      openAboutChannelSets() {
        new ChannelSetModalView({});
      }
    }
  ),
};

</script>


<style lang="less" scoped>

#about-sets {
  vertical-align: sub;
  font-size: 12pt;
  padding: 0px;
  float: left;
  span {
    font-size: 16pt;
    vertical-align: sub;
  }
}

</style>
