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
            <VLayout justify-center>
              <Pagination
                :pageNumber="page.page_number"
                :totalPages="page.total_pages"
              />
            </VLayout>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
  </VContainer>

</template>


<script>

  import uniq from 'lodash/uniq';
  import { mapGetters, mapActions, mapState } from 'vuex';
  import { RouterNames, CHANNEL_PAGE_SIZE } from '../../constants';
  import ChannelItem from './ChannelItem';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';
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
      Pagination,
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
      ...mapGetters('channel', ['getChannels']),
      ...mapState('channel', ['page']),
      listChannels() {
        const channels = this.getChannels(uniq(this.page.results));
        if (!channels) {
          return [];
        }
        return channels.filter(channel => channel[this.listType] && !channel.deleted);
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
            name: RouterNames.CHANNEL_EDIT,
            params: { channelId: id },
            query: { last: this.$route.name },
          });
        });
      },
      loadData(listType) {
        this.loading = true;

        this.loadChannelList({
          listType,
          page_size: CHANNEL_PAGE_SIZE,
          page: Number(this.$route.query.page || 1),
          sortBy: '-modified',
        }).then(() => {
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


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }

</style>
