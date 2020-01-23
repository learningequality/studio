<template>

  <VContainer fluid>
    <VLayout row wrap justify-center>
      <VFlex xs12 sm10 md8 lg6>
        <VLayout>
          <VSpacer />
          <VBtn
            v-if="isEditable && !loading"
            color="primary"
            class="add-channel-button"
            data-test="add-channel"
            @click="newChannel"
          >
            {{ $tr('channel') }}
          </VBtn>
        </VLayout>
      </VFlex>
    </VLayout>

    <VLayout row wrap justify-center>
      <VFlex xs12 sm10 md8 lg6>
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
                :channelId="channel.id"
                allowEdit
              />
            </template>
            <keep-alive>
              <router-view v-if="$route.params.channelId" :key="$route.params.channelId" />
            </keep-alive>
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
  import { generateTempId } from '../../utils';
  import ChannelItem from './ChannelItem.vue';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ListTypes).includes(value);
  }

  export default {
    name: 'ChannelList',
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
        return sortBy(
          this.channels.filter(channel => channel[this.listType]),
          sortFields
        );
      },
      isEditable() {
        return this.listType === ListTypes.EDITABLE;
      },
    },
    beforeRouteEnter(to, from, next) {
      if (listTypeValidator(to.params.listType)) {
        return next(vm => {
          vm.loadData(to.params.listType);
        });
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
          bookmark: false,
          edit: true,
        });
        this.$router.push({
          name: RouterNames.CHANNEL_EDIT,
          params: { channelId: this.newId },
        });
      },
      loadData(listType) {
        this.loading = true;
        this.loadChannelList({ listType }).then(() => {
          this.loading = false;
        });
      },
    },
    $trs: {
      loading: 'Loading channels...',
      noChannelsFound: 'No channels found',
      channel: 'New channel',
    },
  };

</script>


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }

</style>
