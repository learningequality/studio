<template>
  <VContainer fluid>
    <VBtn
      v-if="isEditable && !loading"
      color="primary"
      fixed
      right
      fab
      :title="$tr('channel')"
      @click="newChannel"
    >
      <VIcon>add</VIcon>
    </VBtn>
    <VLayout row wrap justify-center>
      <VFlex xs12 sm10 md6>
        <VLayout row justify-center>
          <VFlex xs12>
            <template v-if="loading">
              <VProgressLinear
                indeterminate
                color="primary"
              />
              <p class="headline mb-0">
                {{ $tr('loading') }}
              </p>
            </template>
            <p v-else-if="listChannels && !listChannels.length" class="headline mb-0">
              {{ $tr('noChannelsFound') }}
            </p>
            <template v-else>
              <ChannelItem
                v-for="channel in listChannels"
                :key="channel.id"
                :channel="channel"
              />
            </template>
            <router-view v-if="!loading"/>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
  </VContainer>
</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapGetters, mapActions, mapState, mapMutations } from 'vuex';
  import { ListTypes, RouterNames } from '../../constants';
  import ChannelItem from './ChannelItem.vue';
  import { generateTempId, isTempId } from '../../utils';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ListTypes).includes(value);
  }

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
    props: {
      listType: {
        type: String,
        validator: listTypeValidator,
      },
    },
    data() {
      return {
        loading: false,
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
    beforeRouteEnter(to, from, next) {
      if(listTypeValidator(to.params.listType)) {
        if (to.name === RouterNames.CHANNELS) {
          return next(vm => {
            vm.loadData(to.params.listType);
          });
        }
        return next();
      }
      return next(false);
    },
    beforeRouteUpdate(to, from, next) {
      if(listTypeValidator(to.params.listType)) {
        if (to.name === RouterNames.CHANNELS) {
          this.loadData(to.params.listType);
        }
        return next();
      }
      return next(false);
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
      loadData(listType) {
        this.loading = true;
        this.loadChannelList({ listType }).then(() => {
          this.loading = false;
        });
      },
    },
  };

</script>


<style lang="less" scoped>


</style>
