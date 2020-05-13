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
          <VBtn flat icon :to="backLink" exact>
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
          <VLayout>
            <VSpacer />
            <VMenu offset-y>
              <template v-slot:activator="{ on }">
                <VBtn :color="dominantColor" dark v-on="on">
                  {{ $tr('downloadButton') }}
                  &nbsp;
                  <Icon>arrow_drop_down</Icon>
                </VBtn>
              </template>
              <VList>
                <VListTile>
                  <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
                </VListTile>
                <VListTile @click="downloadChannelsCSV({id__in: [channelId]})">
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
  import Vibrant from 'node-vibrant';
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
        dominantColor: 'primary',
        details: null,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId);
      },
      thumbnail() {
        let encoding = this.channel.thumbnail_encoding;
        return (encoding && encoding.base64) || this.channel.thumbnail_url;
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
        const channelPromise = this.loadChannel(this.channelId).then(() => {
          // Need to add here in case user is refreshing page
          this.updateTabTitle(this.channel.name);
          let v = new Vibrant(this.thumbnail);
          v.getPalette((err, palette) => {
            if (!err && palette && palette.DarkVibrant) {
              this.dominantColor = palette.DarkVibrant.getHex();
            }
          });
        });
        const detailsPromise = this.loadChannelDetails(this.channelId).then(details => {
          this.details = details;
        });
        Promise.all([channelPromise, detailsPromise])
          .then(() => {
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
