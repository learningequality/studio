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
            <LoadingText v-if="loading" />
            <p v-else-if="listChannels && !listChannels.length" class="headline mb-0">
              {{ $tr('noChannelsFound') }}
            </p>
            <template v-else>
              <ChannelItem
                v-for="channel in listChannels"
                :key="channel.id"
                :channelId="channel.id"
                allowEdit
                fullWidth
              />

            </template>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
  </VContainer>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import { RouteNames } from '../../constants';
  import ChannelItem from './ChannelItem';
  import LoadingText from 'shared/views/LoadingText';
  import { ChannelListTypes } from 'shared/constants';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ChannelListTypes).includes(value);
  }

  export default {
    name: 'ChannelList',
    components: {
      ChannelItem,
      LoadingText,
    },
    props: {
      listType: {
        type: String,
        required: true,
        validator: listTypeValidator,
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapGetters('channel', ['channels']),
      listChannels() {
        const channels = this.channels;
        if (!channels) {
          return [];
        }
        const sortFields = ['modified'];
        const orderFields = ['desc'];
        if (this.listType === ChannelListTypes.PUBLIC) {
          sortFields.unshift('priority');
          orderFields.unshift('desc');
        }
        return orderBy(
          this.channels.filter(channel => channel[this.listType] && !channel.deleted),
          sortFields,
          orderFields
        );
      },
      isEditable() {
        return this.listType === ChannelListTypes.EDITABLE;
      },
    },
    watch: {
      listType(newListType) {
        this.loadData(newListType);
      },
      $route(to, from) {
        if (to.query.page !== from.query.page) {
          this.loadData(this.listType);
        }
      },
    },
    created() {
      this.loadData(this.listType);
    },
    methods: {
      ...mapActions('channel', ['loadChannelList', 'createChannel']),
      newChannel() {
        this.$analytics.trackClick('channel_list', 'Create channel');
        this.createChannel().then(id => {
          this.$router.push({
            name: RouteNames.CHANNEL_EDIT,
            params: { channelId: id, tab: 'edit' },
            query: { last: this.$route.name },
          });
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
      noChannelsFound: 'No channels found',
      channel: 'New channel',
    },
  };

</script>


<style lang="scss" scoped>

  .add-channel-button {
    margin: 0;
  }

</style>
