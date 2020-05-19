<template>

  <VDialog
    ref="dialog"
    :value="channelId && routeParamID === channelId"
    attach="body"
    fullscreen
    scrollable
    app
    persistent
    transition="dialog-bottom-transition"
  >
    <VCard class="channel-wrapper">
      <VToolbar dark fixed>
        <VToolbarItems>
          <VBtn flat icon :to="backLink" exact data-test="close">
            <Icon>clear</Icon>
          </VBtn>
        </VToolbarItems>
        <VToolbarTitle v-if="channel" class="notranslate">
          {{ channel.name }}
        </VToolbarTitle>
      </VToolbar>
      <LoadingText v-if="loading" absolute />
      <div v-else-if="channel">
        <VCardText>
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
                <VListTile>
                  <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
                </VListTile>
                <VListTile data-test="dl-csv" @click="downloadChannelsCSV({id__in: [channelId]})">
                  <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
                </VListTile>
              </VList>
            </VMenu>
          </VLayout>
          <Details
            v-if="channel && details"
            class="channel-details-wrapper"
            :details="{ ...channel, ...details }"
            :loading="loading"
          />
        </VCardText>
      </div>
    </VCard>
  </VDialog>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { channelExportMixin } from './mixins';
  import Details from 'shared/views/details/Details';
  import { fileSizeMixin, constantsTranslationMixin, routerMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'ChannelDetailsModal',
    components: {
      Details,
      LoadingText,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin, routerMixin, channelExportMixin],
    props: {
      channelId: {
        type: String,
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
      channel() {
        return this.getChannel(this.channelId);
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
    watch: {
      routeParamID(val) {
        this.hideHTMLScroll(!!val);
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
      this.hideHTMLScroll(true);
    },
    methods: {
      ...mapActions('channel', ['loadChannel', 'loadChannelDetails']),
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
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
      },
    },
    $trs: {
      downloadButton: 'Download channel summary',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
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

  .channel-wrapper {
    overflow-y: auto;
    .v-card__text {
      padding-top: 72px;
    }
  }

  .channel-details-wrapper {
    max-width: 900px;
    padding-bottom: 100px;
    margin: 0 auto;
  }

</style>
