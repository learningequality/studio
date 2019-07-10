<template>
  <div class="channel-list">
    <div v-if="isEditable" class="new-button">
      <button class="action-button" :title="$tr('addChannel')" @click="newChannel">
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
        :channel="channel"
      />
    </div>
    <router-view v-if="!loading"/>
  </div>
</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapGetters, mapActions, mapState, mapMutations } from 'vuex';
  import { setChannelMixin } from '../../mixins';
  import { ListTypes, RouterNames } from '../../constants';
  import ChannelItem from './ChannelItem.vue';
  import { generateTempId, isTempId } from '../../utils';

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
          return Object.values(ListTypes).includes(value);
        },
      },
    },
    data() {
      return {
        loading: true,
        newSetId: generateTempId(),
      };
    },
    computed: {
      ...mapGetters('channelList', ['channels']),
      ...mapState({
        language: state => state.session.currentLanguage,
        preferences: state => state.session.preferences,
      }),
      listChannels() {
        const sortFields = ['-modified'];
        if (this.listType === ListTypes.PUBLIC) {
          sortFields.shift('-priority');
        }
        return sortBy(this.channels.filter(channel => channel[this.listType]), sortFields);
      },
      isEditable() {
        return this.listType === ListTypes.EDITABLE;
      },
    },
    watch: {
      listType() {
        this.loadData();
      },
    },
    created() {
      this.loadData();
    },
    methods: {
      ...mapActions('channelList', ['loadChannelList']),
      ...mapMutations('channelList', {
        addChannel: 'ADD_CHANNEL',
        removeChannel: 'REMOVE_CHANNEL',
      }),
      newChannel() {
        // Clear any previously existing dummy channelset
        this.removeChannel(this.newId);
        this.newId = generateTempId();
        this.addChannel({
          id: this.newId,
          name: '',
          description: '',
          language: this.preferences ? this.preferences.language : this.language,
          content_defaults: this.preferences,
          thumbnail_url: '',
        });
        this.$router.push({ name: RouterNames.CHANNEL_DETAILS, params: {channelId: this.newId }});
      },
      createChannel() {
        this.setChannel('');
      },
      loadData() {
        this.loading = true;
        this.loadChannelList(this.listType).then(() => {
          this.loading = false;
        });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../static/less/channel_list.less';

</style>
