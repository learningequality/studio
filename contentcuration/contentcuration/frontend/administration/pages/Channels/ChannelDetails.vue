<template>

  <FullscreenModal v-model="dialog">
    <template #close>
      <VBtn
        flat
        exact
        style="font-size: 14pt; text-transform: none"
        @click="dialog = false"
      >
        <Icon
          class="mr-2"
          :color="$themeTokens.textInverted"
          icon="back"
        />

        Channel list
      </VBtn>
    </template>
    <template #tabs>
      <VTab
        class="px-3"
        data-test="info-tab"
        @click="tab = 'info'"
      >
        Channel info
      </VTab>
      <VTab
        class="px-3"
        data-test="share-tab"
        @click="tab = 'share'"
      >
        Sharing
      </VTab>
    </template>
    <LoadingText
      v-if="loading"
      absolute
    />
    <VCardText v-else>
      <Banner
        error
        :value="isDeleted"
        class="mb-4"
      >
        This channel has been deleted
      </Banner>
      <VTabsItems v-model="tab">
        <VTabItem value="info">
          <VLayout class="mb-3">
            <VSpacer />
            <ChannelActionsDropdown
              :channelId="channelId"
              color="greyBackground"
              @deleted="dialog = false"
            />
          </VLayout>
          <VCard
            flat
            class="px-5"
          >
            <StudioDetailsPanel
              v-if="channel && details"
              :details="channelWithDetails"
              :loading="loading"
            />
          </VCard>
        </VTabItem>
        <VTabItem value="share">
          <VCard
            flat
            class="pa-5"
          >
            <ChannelSharing :channelId="channelId" />
          </VCard>
        </VTabItem>
      </VTabsItems>
    </VCardText>
  </FullscreenModal>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import ChannelActionsDropdown from './ChannelActionsDropdown';
  import ChannelSharing from 'shared/views/channel/ChannelSharing';
  import StudioDetailsPanel from 'shared/views/details/StudioDetailsPanel';
  import { routerMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import Banner from 'shared/views/Banner';

  export default {
    name: 'ChannelDetails',
    components: {
      StudioDetailsPanel,
      LoadingText,
      FullscreenModal,
      ChannelSharing,
      ChannelActionsDropdown,
      Banner,
    },
    mixins: [routerMixin],
    props: {
      channelId: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        tab: 'info',
        loading: true,
        details: null,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      dialog: {
        get() {
          return this.channelId && this.routeParamID === this.channelId;
        },
        set(value) {
          if (!value) {
            this.$router.push(this.backLink).catch(() => {});
          }
        },
      },
      channel() {
        return this.getChannel(this.channelId);
      },
      isDeleted() {
        return this.channel && Boolean(this.channel?.deleted);
      },
      channelWithDetails() {
        if (!this.channel || !this.details) {
          return {};
        }
        return { ...this.channel, ...this.details };
      },
      backLink() {
        return {
          name: RouteNames.CHANNELS,
          query: this.$route.query,
        };
      },
      routeParamID() {
        return this.$route.params.channelId;
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        if (vm.channel) {
          // Modal has already been opened
          vm.updateTitleForPage();
        }
      });
    },
    beforeMount() {
      return this.load();
    },
    methods: {
      ...mapActions('channel', ['loadChannel', 'loadChannelDetails']),
      updateTitleForPage() {
        this.updateTabTitle(`${this.channel.name} - Channels - Administration`);
      },
      load() {
        this.loading = true;
        const channelPromise = this.loadChannel(this.channelId);
        const detailsPromise = this.loadChannelDetails(this.channelId);

        return Promise.all([channelPromise, detailsPromise])
          .then(([channel, details]) => {
            // Channel either doesn't exist or user doesn't have access to channel
            if (!channel) {
              this.$router.replace(this.backLink).catch(() => {});
              return;
            }
            // Need to add here in case user is refreshing page
            this.updateTitleForPage();

            this.details = details;
            this.loading = false;
          })
          .catch(error => {
            this.$store.dispatch('errors/handleAxiosError', error);
          });
      },
    },
  };

</script>
