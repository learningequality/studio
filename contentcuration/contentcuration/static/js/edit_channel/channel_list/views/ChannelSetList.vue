<template>
  <div class="channel-list">
    <div class="new-button">
      <a id="about-sets" class="action-text" @click="openAboutChannelSets">
        <span class="material-icons">
          info
        </span> {{ $tr('aboutChannelSets') }}
      </a>
      <a
        id="new-set"
        class="action-button"
        :title="$tr('addChannelSetTitle')"
        @click="newChannelSet"
      >
        <span class="material-icons">
          add
        </span> {{ $tr('addChannelSetButton') }}
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
        :channelSetID="channelSet.id"
      />
    </div>
  </div>
</template>

<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import ChannelSetItem from './ChannelSetItem.vue';
  import { getChannelSetModel } from './../utils';
  import { ChannelSetInformationModalView } from 'edit_channel/information/views';
  import { ChannelSetModalView } from 'edit_channel/channel_set/views';

  export default {
    name: 'ChannelSetList',
    $trs: {
      loading: 'Loading collections...',
      noChannelSetsFound:
        'You can package together multiple Studio channels to create a collection. Use a collection token to make multiple channels available for import at once in Kolibri!',
      addChannelSetTitle: 'Create a new collection of channelsn',
      addChannelSetButton: 'Collection',
      aboutChannelSets: 'About Collections',
    },
    components: {
      ChannelSetItem,
    },
    data() {
      return {
        loading: true,
      };
    },
    computed: mapGetters('channel_list', ['channelSets']),
    mounted() {
      this.loadChannelSetList().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channel_list', ['loadChannelSetList']),
      ...mapMutations('channel_list', {
        addChannelSet: 'ADD_CHANNELSET',
      }),
      openAboutChannelSets() {
        new ChannelSetInformationModalView({});
      },
      newChannelSet() {
        new ChannelSetModalView({
          modal: true,
          isNew: true,
          model: getChannelSetModel({}),
          onsave: this.addChannelSet,
        });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  #about-sets {
    float: left;
    padding: 0;
    font-size: 12pt;
    vertical-align: sub;
    span {
      font-size: 16pt;
      vertical-align: sub;
    }
  }

  .no-channel-sets {
    margin-top: 30px;
    font-size: 14pt;
    color: @gray-500;
    text-align: center;
  }

</style>
