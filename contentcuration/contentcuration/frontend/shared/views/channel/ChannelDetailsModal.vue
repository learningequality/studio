<template>

  <StudioImmersiveModal v-model="dialog">
    <template #header>
      <span class="notranslate">{{ channel ? channel.name : '' }}</span>
    </template>
    <StudioLargeLoader v-if="show('channelDetails', loading, 500)" />
    <div v-else-if="channel">
      <div
        class="download-button-container"
        :style="downloadButtonContainerStyle"
      >
        <KButton
          :text="$tr('downloadButton')"
          :primary="true"
          hasDropdown
          :style="downloadButtonStyle"
        >
          <template #menu>
            <KDropdownMenu
              :options="downloadOptions"
              @select="handleDownloadSelect"
            />
          </template>
        </KButton>
      </div>
      <StudioDetailsPanel
        v-if="channel && details"
        class="channel-details-wrapper"
        :details="channelWithDetails"
        :loading="loading"
      />
    </div>
  </StudioImmersiveModal>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { computed } from 'vue';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { channelExportMixin } from './mixins';
  import { qaChannelData } from './qaChannelData';
  import StudioDetailsPanel from 'shared/views/details/StudioDetailsPanel.vue';
  import StudioLargeLoader from 'shared/views/StudioLargeLoader';
  import StudioImmersiveModal from 'shared/views/StudioImmersiveModal';
  import { routerMixin } from 'shared/mixins';

  export default {
    name: 'ChannelDetailsModal',
    components: {
      StudioDetailsPanel,
      StudioLargeLoader,
      StudioImmersiveModal,
    },
    mixins: [routerMixin, channelExportMixin],
    setup() {
      const { show } = useKShow();
      const { windowIsSmall } = useKResponsiveWindow();

      const downloadButtonContainerStyle = computed(() => ({
        justifyContent: windowIsSmall.value ? 'center' : 'flex-end',
      }));

      const downloadButtonStyle = computed(() => ({
        width: windowIsSmall.value ? '100%' : 'auto',
      }));

      return {
        show,
        downloadButtonContainerStyle,
        downloadButtonStyle,
      };
    },
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
        return { ...this.channel, ...this.details, ...qaChannelData };
      },
      downloadOptions() {
        return [
          { label: this.$tr('downloadPDF'), value: 'pdf' },
          { label: this.$tr('downloadCSV'), value: 'csv' },
        ];
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
      handleDownloadSelect(option) {
        if (option.value === 'pdf') {
          this.generatePDF();
        } else if (option.value === 'csv') {
          this.generateCSV();
        }
      },
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

  .download-button-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 32px;
    margin-bottom: 24px;
  }

  .channel-details-wrapper {
    max-width: 900px;
    padding-bottom: 100px;
    margin: 0 auto;
  }

</style>
