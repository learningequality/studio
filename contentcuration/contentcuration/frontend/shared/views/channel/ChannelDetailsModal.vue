<template>

  <FullscreenModal
    v-model="dialog"
    color="appBarDark"
    :dark="true"
  >
    <template #header>
      <span class="notranslate">{{ channel ? channel.name : '' }}</span>
    </template>
    <LoadingText
      v-if="loading"
      absolute
    />
    <VCardText v-else-if="channel">
      <VLayout class="mb-3">
        <VSpacer v-if="$vuetify.breakpoint.smAndUp" />
        <BaseMenu>
          <template #activator="{ on }">
            <VBtn
              color="primary"
              dark
              :block="$vuetify.breakpoint.xsOnly"
              v-on="on"
            >
              {{ $tr('downloadButton') }}
              &nbsp;
              <Icon
                icon="dropdown"
                :color="$themeTokens.textInverted"
              />
            </VBtn>
          </template>
          <VList>
            <VListTile @click="generatePDF">
              <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
            </VListTile>
            <VListTile
              data-test="dl-csv"
              @click="generateCSV"
            >
              <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
            </VListTile>
          </VList>
        </BaseMenu>
      </VLayout>
      <StudioDetailsPanel
        v-if="channel && details"
        class="channel-details-wrapper"
        :details="channelWithDetails"
        :loading="loading"
      />
    </VCardText>
  </FullscreenModal>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { channelExportMixin } from './mixins';
  import { routerMixin } from 'shared/mixins';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import LoadingText from 'shared/views/LoadingText';
  import StudioDetailsPanel from 'shared/views/details/StudioDetailsPanel.vue';

  export default {
    name: 'ChannelDetailsModal',
    components: {
      StudioDetailsPanel,
      LoadingText,
      FullscreenModal,
    },
    mixins: [routerMixin, channelExportMixin],
    props: {
      channelId: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        dialog: true,
        loading: true,
        loadError: false,
        details: null,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
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
          name: this.$route.query.last,
          params: this.$route.params,
          query: {
            // we can navigate to this component
            // from the catalog search page =>
            // do not lose search query
            ...this.$route.query,
            last: undefined,
          },
        };
      },
    },
    watch: {
      dialog(newValue) {
        if (!newValue) {
          this.$router.push(this.backLink).catch(() => {});
        }
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        if (vm.channel) {
          // Modal has already been opened
          vm.updateTabTitle(vm.channel.name);
        }
      });
    },
    mounted() {
      this.load();
      this.$analytics.trackAction('channel_details', 'View', {
        id: this.channelId,
      });
    },
    methods: {
      ...mapActions('channel', ['loadChannel', 'loadChannelDetails']),
      async generatePDF() {
        this.$analytics.trackEvent('channel_details', 'Download PDF', {
          id: this.channelId,
        });
        this.loading = true;
        await this.generateChannelsPDF([this.channelWithDetails]);
        this.loading = false;
      },
      generateCSV() {
        this.$analytics.trackEvent('channel_details', 'Download CSV', {
          id: this.channelId,
        });
        this.generateChannelsCSV([this.channelWithDetails]);
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
              this.dialog = false;
              return;
            }
            // Need to add here in case user is refreshing page
            this.updateTabTitle(channel.name);

            this.details = details;
            this.loading = false;
          })
          .catch(error => {
            this.$store.dispatch('errors/handleAxiosError', error);
            this.loading = false;
            this.loadError = true;
          });
      },
    },
    $trs: {
      downloadButton: 'Download channel summary',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
    },
  };

</script>


<style lang="scss" scoped>

  .v-toolbar__title {
    font-weight: bold;
  }

  .draft-header {
    padding-right: 10px;
    font-style: italic;
    color: gray;
  }

  .channel-details-wrapper {
    max-width: 900px;
    padding-bottom: 100px;
    margin: 0 auto;
  }

</style>
