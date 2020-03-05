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
      <VToolbar
        flat
        :dark="Boolean(dominantColor)"
        fixed
        :color="dominantColor"
        class="notranslate"
      >
        <VToolbarItems>
          <VBtn flat icon :to="backLink" replace>
            <VIcon>clear</VIcon>
          </VBtn>
        </VToolbarItems>
        <VSpacer />
        <VToolbarTitle v-if="channel">
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
                <VBtn
                  color="primary"
                  flat
                  v-on="on"
                >
                  {{ $tr('downloadButton') }}
                  &nbsp;
                  <VIcon class="notranslate">
                    arrow_drop_down
                  </VIcon>
                </VBtn>
              </template>
              <VList>
                <VListTile
                  v-for="(option, index) in downloadOptions"
                  :key="index"
                  :href="option.href"
                  download
                >
                  <VListTileTitle>{{ option.title }}</VListTileTitle>
                </VListTile>
              </VList>
            </VMenu>
          </VLayout>
          <div class="channel-details-wrapper">
            <VImg
              :src="channel.thumbnail_url || '/static/img/kolibri_placeholder.png'"
              :aspect-ratio="16/9"
              max-width="300"
            />
            <br>
            <h1 class="notranslate">
              {{ channel.name }}
            </h1>
            <p class="notranslate">
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
  import Details from 'shared/views/details/Details';
  import DetailsRow from 'shared/views/details/DetailsRow';
  import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'ChannelDetailsModal',
    components: {
      Details,
      LoadingText,
      DetailsRow,
      CopyToken,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin],
    props: {
      channelId: {
        type: String,
      },
    },
    data() {
      return {
        loading: true,
        loadError: false,
        dominantColor: '',
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId);
      },
      thumbnail() {
        return this.channel.thumbnail_url || '/static/img/kolibri_placeholder.png';
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
      downloadOptions() {
        return [
          {
            title: this.$tr('downloadCSV'),
            href: window.Urls.get_channel_details_csv_endpoint(this.channel.id),
          },
          {
            title: this.$tr('downloadPDF'),
            href: window.Urls.get_channel_details_pdf_endpoint(this.channel.id) + '?condensed=true',
          },
          {
            title: this.$tr('downloadDetailedPDF'),
            href: window.Urls.get_channel_details_pdf_endpoint(this.channel.id),
          },
          {
            title: this.$tr('downloadPPT'),
            href: window.Urls.get_channel_details_ppt_endpoint(this.channel.id),
          },
        ];
      },
    },
    watch: {
      routeParamID(val) {
        this.hideHTMLScroll(!!val);
      },
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
      downloadButton: 'Download channel report',
      downloadDetailedPDF: 'Download Detailed PDF',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
      downloadPPT: 'Download PPT',
      tokenHeading: 'Channel Token',
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
