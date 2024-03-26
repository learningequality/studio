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
    <VLayout row wrap justify-center>
      <VFlex xs12 sm10 md8 lg6>
        <VLayout row justify-center>
          <VFlex xs12>
            <KCard
              style="width:700px;"
              title="Section 1.10.32 of de Finibus Bonorum et Malorum, written by Cicero in 45 BC"
              headingLevel="2"
              :to="{ }"
              layout="horizontal"
              thumbnailScaleType="cover"
              thumbnailDisplay="large"
              thumbnailSrc="https://domf5oio6qrcr.cloudfront.net/medialibrary/11525/0a5ae820-7051-4495-bcca-61bf02897472.jpg"
            >
              <template #aboveTitle>
                <p>
                  Lorem ipsum dolor, sit amet consectetur adipisicing elit. 
                  Corporis eligendi quis impedit voluptatibus recusandae ratione sed,
                  voluptatem at nostrum nobis quidem architecto magnam quod nemo 
                  a rerum dolores neque quas?
                </p>
              </template>
              <template #title>
                <p>Title section of the KCard component</p>
              </template>
              <template #belowTitle>
                <p>below title slot section for the KCard component</p>
              </template>
              <template #footer>
                <p>footer section for the KCard component </p>
              </template>
            </KCard>
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
  import KCard from './../KCard/index.vue';
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
    KCard
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


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }

</style>
