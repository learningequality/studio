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
          <div class="channel-details-wrapper">
            <div style="max-width: 300px">
              <Thumbnail
                :src="channel.thumbnail_url"
                :encoding="channel.thumbnail_encoding"
              />
            </div>
            <br>
            <h1 class="notranslate" dir="auto">
              {{ channel.name }}
            </h1>
            <p class="notranslate" dir="auto">
              {{ channel.description }}
            </p>
            <br>

            <template>
              <DetailsRow v-if="channel.published" :label="$tr('tokenHeading')">
                <template v-slot>
                  <CopyToken
                    :token="channel.primary_token"
                    style="max-width:max-content;"
                  />
                </template>
              </DetailsRow>
              <DetailsRow :label="$tr('publishedHeading')">
                <span v-if="channel.published">{{ publishedDate }}</span>
                <em v-else>{{ $tr('unpublishedText') }}</em>
              </DetailsRow>
            </template>

            <DetailsRow
              v-if="channel.language"
              :label="$tr('primaryLanguageHeading')"
              :text="translateLanguage(channel.language)"
            />
            <Details :nodeID="channel.root_id" />
          </div>
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
  import DetailsRow from 'shared/views/details/DetailsRow';
  import { fileSizeMixin, constantsTranslationMixin, routerMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import CopyToken from 'shared/views/CopyToken';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ChannelDetailsModal',
    components: {
      Details,
      LoadingText,
      DetailsRow,
      CopyToken,
      Thumbnail,
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
      publishedDate() {
        return this.$formatDate(this.channel.last_published, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
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
      ...mapActions('channel', ['loadChannel']),
      load() {
        this.loading = true;
        this.loadChannel(this.channelId).then(() => {
          // Need to add here in case user is refreshing page
          this.updateTabTitle(this.channel.name);
          this.loading = false;
          let v = new Vibrant(this.thumbnail);
          v.getPalette((err, palette) => {
            if (!err && palette && palette.DarkVibrant) {
              this.dominantColor = palette.DarkVibrant.getHex();
            }
          }).catch(() => {
            this.loading = false;
            this.loadError = true;
          });
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
      tokenHeading: 'Channel token',
      publishedHeading: 'Published date',
      primaryLanguageHeading: 'Primary language',
      unpublishedText: 'Unpublished',
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
