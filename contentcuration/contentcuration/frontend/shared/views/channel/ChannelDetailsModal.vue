<template>

  <FullscreenModal
    v-model="dialog"
    color="black"
  >
    <template #header>
      <span class="notranslate">{{ channel.name }}</span>
    </template>
    <template v-if="adminMode" #tabs>
      <VTab href="#info" class="px-3" @click="currentTab = 'info'">
        {{ $tr('infoTab') }}
      </VTab>
      <VTab href="#share" class="px-3" @click="currentTab = 'share'">
        {{ $tr('shareTab') }}
      </VTab>
    </template>
    <LoadingText v-if="loading" absolute />
    <VCardText v-else-if="channel">
      <VTabsItems v-model="currentTab">
        <VTabItem value="info">
          <VLayout class="mb-3">
            <VSpacer v-if="$vuetify.breakpoint.smAndUp" />
            <VMenu offset-y>
              <template v-slot:activator="{ on }">
                <VBtn color="primary" dark :block="$vuetify.breakpoint.xsOnly" v-on="on">
                  {{ $tr('downloadButton') }}
                  &nbsp;
                  <Icon>arrow_drop_down</Icon>
                </VBtn>
              </template>
              <VList>
                <VListTile @click="generatePdf">
                  <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
                </VListTile>
                <VListTile data-test="dl-csv" @click="generateChannelsCSV([channelWithDetails])">
                  <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
                </VListTile>
              </VList>
            </VMenu>
          </VLayout>
          <Details
            v-if="channel && details"
            class="channel-details-wrapper"
            :details="channelWithDetails"
            :loading="loading"
          />
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
  import { channelExportMixin } from './mixins';
  import ChannelSharing from './ChannelSharing';
  import Details from 'shared/views/details/Details';
  import { fileSizeMixin, constantsTranslationMixin, routerMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import FullscreenModal from 'shared/views/FullscreenModal';

  export default {
    name: 'ChannelDetailsModal',
    components: {
      Details,
      LoadingText,
      FullscreenModal,
      ChannelSharing,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin, routerMixin, channelExportMixin],
    props: {
      channelId: {
        type: String,
      },
      adminMode: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        loading: true,
        loadError: false,
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
      currentTab: {
        get() {
          let sharing = this.$route.query.sharing;
          // On load, sharing counts as string, so just process as if a string
          sharing = this.adminMode && sharing && sharing.toString() === 'true';
          return sharing ? 'share' : 'info';
        },
        set(value) {
          this.$router.replace({
            ...this.$route,
            query: {
              ...this.$route.query,
              sharing: value === 'share',
            },
          });
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
          name: this.$route.matched[0].name,
          query: this.$route.query,
          params: {
            ...this.$route.params,
            channelId: null,
          },
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
          vm.updateTabTitle(vm.channel.name);
        }
      });
    },
    mounted() {
      this.load();
    },
    methods: {
      ...mapActions('channel', ['loadChannel', 'loadChannelDetails']),
      async generatePdf() {
        this.loading = true;
        await this.generateChannelsPDF([this.channelWithDetails]);
        this.loading = false;
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
            this.updateTabTitle(channel.name);

            this.details = details;
            this.loading = false;
          })
          .catch(() => {
            this.loading = false;
            this.loadError = true;
          });
      },
    },
    $trs: {
      downloadButton: 'Download channel summary',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
      infoTab: 'Channel info',
      shareTab: 'Sharing',
    },
  };

</script>


<style lang="less" scoped>

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
