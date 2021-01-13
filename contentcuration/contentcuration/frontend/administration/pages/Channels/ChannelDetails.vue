<template>

  <FullscreenModal v-model="dialog">
    <template #close>
      <VBtn flat exact style="font-size: 14pt; text-transform: none;" @click="dialog = false">
        <Icon class="mr-2">
          arrow_back
        </Icon>
        Channel list
      </VBtn>
    </template>
    <template #tabs>
      <VTab class="px-3" data-test="info-tab" @click="tab = 'info'">
        Channel info
      </VTab>
      <VTab class="px-3" data-test="share-tab" @click="tab = 'share'">
        Sharing
      </VTab>
    </template>
    <LoadingText v-if="loading" absolute />
    <VCardText v-else>
      <Banner error :value="channel.deleted" class="mb-4">
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
          <VCard flat class="px-5">
            <Details
              v-if="channel && details"
              :details="channelWithDetails"
              :loading="loading"
            />
          </VCard>
        </VTabItem>
        <VTabItem value="share">
          <VCard flat class="pa-5">
            <ChannelSharing :channelId="channelId" />
          </VCard>
        </VTabItem>
      </VTabsItems>
    </VCardText>
  </FullscreenModal>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../../constants';
  import ChannelActionsDropdown from './ChannelActionsDropdown';
  import ChannelSharing from 'shared/views/channel/ChannelSharing';
  import Details from 'shared/views/details/Details';
  import { routerMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import Banner from 'shared/views/Banner';

  export default {
    name: 'ChannelDetails',
    components: {
      Details,
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
            this.$router.push(this.backLink);
          }
        },
      },
      channel() {
        return this.getChannel(this.channelId);
      },
      channelWithDetails() {
        if (!this.channel || !this.details) {
          return {};
        }
        return { ...this.channel, ...this.details };
      },
      backLink() {
        return {
          name: RouterNames.CHANNELS,
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
              this.$router.replace(this.backLink);
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
