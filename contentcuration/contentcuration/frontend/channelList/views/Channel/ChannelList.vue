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

  import sortBy from 'lodash/sortBy';
  import { mapGetters, mapActions } from 'vuex';
  import { RouterNames } from '../../constants';
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
        if (!this.channels) {
          return [];
        }

        const sortFields = ['-modified'];
        if (this.listType === ChannelListTypes.PUBLIC) {
          sortFields.shift('-priority');
        }
        return sortBy(
          this.channels.filter(channel => channel[this.listType] && !channel.deleted),
          sortFields
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


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }

</style>
