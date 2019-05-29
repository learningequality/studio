<template>
  <div class="channel-list">
    <div v-if="isEditable" class="new-button">
      <button class="action-button" :title="$tr('addChannel')" @click="createChannel">
        <span class="material-icons align-text-top">
          add
        </span> {{ $tr('channel') }}
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
        :channelID="channel.id"
      />
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapState, mapActions } from 'vuex';
  import { setChannelMixin } from '../mixins';
  import { ListTypes } from '../constants';
  import ChannelItem from './ChannelItem.vue';

  export default {
    name: 'ChannelList',
    $trs: {
      loading: 'Loading channels...',
      noChannelsFound: 'No channels found',
      channel: 'Channel',
      addChannel: 'Create a new channel',
    },
    components: {
      ChannelItem,
    },
    mixins: [setChannelMixin],
    props: {
      listType: {
        type: String,
        validator: function(value) {
          // The value must match one of the ListTypes
          return _.contains(_.values(ListTypes), value);
        },
      },
    },
    data() {
      return {
        loading: true,
      };
    },
    computed: {
      ...mapState('channel_list', ['channels']),
      listChannels() {
        return _.chain(this.channels)
          .where({ [this.listType]: true })
          .sortBy(channel => {
            return this.listType === ListTypes.PUBLIC ? -channel.priority : null;
          })
          .sortBy('-modified')
          .value();
      },
      isEditable() {
        return this.listType === ListTypes.EDITABLE;
      },
    },
    mounted() {
      this.loadChannelList(this.listType).then(() => {
        this.loading = false;
        this.$emit('channel_list_ready');
      });
    },
    methods: {
      ...mapActions('channel_list', ['loadChannelList']),
      createChannel() {
        this.setChannel('');
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

</style>
