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

    <div class="" style="width:600px">
      <KCard
        layout="vertical"
        thumbnailDisplay="none"
        thumbnailSrc="https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg"
        :headingLevel="3"
        :to="{ }"
        thumbnailScaleType=""
      >
        <template #aboveTitle>
          <p>{{ $tr('className') }}</p>
        </template>

        <template #footer>
          <div>
            <ProgressBar
              :progressPercent="30"
              :currentTaskError="false"
            />
          </div>
        </template>
        <template #belowTitle>
          <KTextTruncator
            :text="description"
            :maxLines="2"
            class="description-style"
          />
        </template>
      </KCard>
    </div>
  </VContainer>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import { RouteNames } from '../../constants';
  import ProgressBar from '../../../channelEdit/views/progress/ProgressBar.vue';
  import KCard from '../KCard';
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
      KCard,
      ProgressBar
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
        description :"It is not meant to be the Rather, it offers a logic that is common to all of them and makes creation logic that is common to all of them and makes creation logic that is common to all of them and makes creation ",

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
      className: 'Class name 2',
    },
  };

</script>


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }
  .description-style{
    font-size:1.2em;
    font-weight:bold;
  }

</style>
