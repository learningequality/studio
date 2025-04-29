<template>

  <ResizableNavigationDrawer
    right
    :localName="'channel-details'"
    :value="value"
    :permanent="true"
    :temporary="false"
    clipped
    app
    v-bind="$attrs"
    style="position: fixed; z-index: 10"
    @input="$emit('input', $event)"
    @resize="$emit('resize', $event)"
  >
    <div class="channel-details-content">
      <VLayout
        row
        align-center
        class="mb-4"
      >
        <VFlex>
          <h2 class="font-weight-bold headline">
            {{ channel ? channel.name : '' }}
          </h2>
        </VFlex>
        <VSpacer />
        <VFlex shrink>
          <KIconButton
            icon="close"
            :tooltip="$tr('close')"
            @click="$emit('input', false)"
          />
        </VFlex>
      </VLayout>
      <DetailsPanel
        v-if="channel && details"
        :details="channelWithDetails"
        :loading="loading"
        @generate-pdf="generatePDF"
        @generate-csv="generateCSV"
      />
    </div>
  </ResizableNavigationDrawer>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import DetailsPanel from 'shared/views/details/DetailsPanel';
  import { routerMixin } from 'shared/mixins';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import { channelExportMixin } from 'shared/views/channel/mixins';

  export default {
    name: 'ChannelDetailsSidePanel',
    components: {
      ResizableNavigationDrawer,
      DetailsPanel,
    },
    mixins: [routerMixin, channelExportMixin],
    props: {
      channelId: {
        type: String,
        default: null,
      },
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        details: null,
        loading: true,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),

      channelWithDetails() {
        if (!this.channel || !this.details) {
          return {};
        }
        return { ...this.channel, ...this.details };
      },
      channel() {
        return this.getChannel(this.channelId);
      },
    },
    beforeMount() {
      return this.load();
    },
    methods: {
      ...mapActions('channel', ['loadChannel', 'loadChannelDetails']),
      load() {
        this.loading = true;
        const channelPromise = this.loadChannel(this.channelId);
        const detailsPromise = this.loadChannelDetails(this.channelId);

        return Promise.all([channelPromise, detailsPromise])
          .then(([channel, details]) => {
            if (!channel) {
              this.$router.replace(this.backLink).catch(() => {});
              return;
            }

            this.details = details;
            this.loading = false;
          })
          .catch(error => {
            this.loading = false;
            if (error.response) {
              this.$store.dispatch('errors/handleAxiosError', error);
            } else {
              this.$store.dispatch('showSnackbarSimple', 'Error loading channel details');
            }
          });
      },
      async generatePDF() {
        try {
          this.$analytics.trackEvent('channel_details', 'Download PDF', {
            id: this.channelId,
          });
          await this.generateChannelsPDF([this.channelWithDetails]);
        } catch (error) {
          this.$store.dispatch('showSnackbarSimple', 'Error generating PDF');
        }
      },
      async generateCSV() {
        this.$analytics.trackEvent('channel_details', 'Download CSV', {
          id: this.channelId,
        });
        await this.generateChannelsCSV([this.channelWithDetails]);
      },
    },
    $trs: {
      close: 'Close',
    },
  };

</script>


<style>

  .channel-details-content {
    padding: 20px;
    padding-top: 40px;
  }

</style>
