<template>

  <div class="channel-list">
    <div class="new-button">
      <a class="action-text" id="about-sets" @click="openAboutChannelSets">
        <span class="material-icons">info</span> {{ $tr('aboutChannelSets') }}
      </a>
      <a class="action-button" id="new-set" :title="$tr('addChannelSetTitle')" @click="newChannelSet">
        <span class="material-icons">add</span> {{ $tr('addChannelSetButton') }}
      </a>
    </div>

    <div v-if="loading" class="default-item">
      {{ $tr('loading') }}
    </div>
    <div v-else-if="channelSets && !channelSets.length" class="no-channel-sets">
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

import { mapGetters, mapActions, mapMutations } from 'vuex';
import ChannelSetItem from './ChannelSetItem.vue';
import { ChannelSetInformationModalView } from 'edit_channel/information/views';
import { ChannelSetModalView } from 'edit_channel/channel_set/views';

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
  computed: mapGetters('channel_list', [
    'channelSets'
  ]),
  methods: Object.assign(
    mapActions('channel_list', [
      'loadChannelSetList',
      'getChannelSetModel'
    ]),
    mapMutations('channel_list', {
      addChannelSet: 'ADD_CHANNELSET'
    }),
    {
      openAboutChannelSets() {
        new ChannelSetInformationModalView({});
      },
      newChannelSet() {
        this.getChannelSetModel({}).then((channelSet) => {
          let channelSetView = new ChannelSetModalView({
            modal: true,
            isNew: true,
            model: channelSet,
            onsave: this.addChannelSet
          });
        });
      }
    }
  ),
};


</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

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

.no-channel-sets {
  margin-top: 30px;
  color: @gray-500;
  font-size: 14pt;
  text-align: center;
}

</style>
