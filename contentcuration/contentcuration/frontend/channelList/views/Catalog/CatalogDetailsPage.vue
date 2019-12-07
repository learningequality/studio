<template>

  <VDialog
    ref="dialog"
    :value="$route.params.itemID == itemID"
    attach="body"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <VCard class="catalog-item-wrapper">
      <v-toolbar flat :dark="Boolean(dominantColor)" fixed :color="dominantColor">
        <v-toolbar-items>
          <v-btn flat icon :to="backLink">
            <v-icon>arrow_back</v-icon>
          </v-btn>
        </v-toolbar-items>
        <v-spacer />
        <v-toolbar-title v-if="item">
          {{ item.name }}
        </v-toolbar-title>
      </v-toolbar>
      <LoadingText v-if="loading" />
      <div v-else>
        <VCardText>
          <v-layout>
            <v-spacer />
            <v-menu offset-y>
              <template v-slot:activator="{ on }">
                <v-btn
                  color="primary"
                  flat
                  v-on="on"
                >
                  {{ $tr('downloadButton') }}
                  &nbsp;
                  <v-icon>arrow_drop_down</v-icon>
                </v-btn>
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
            </v-menu>
          </v-layout>
          <VImg
            :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
            :aspect-ratio="16/9"
            max-width="300"
          />
          <br>
          <h1>{{ item.name }}</h1>
          <p>{{ item.description }}</p>
          <br>

          <DetailsRow
            v-if="item.language"
            :label="$tr('primaryLanguageHeading')"
            :text="translateLanguage(item.language)"
          />

          <template>
            <DetailsRow v-if="item.published" :label="$tr('tokenHeading')">
              <template v-slot>
                <CopyToken
                  :token="item.primary_token"
                  style="max-width:max-content;"
                />
              </template>
            </DetailsRow>
            <DetailsRow :label="$tr('publishedHeading')">
              <span v-if="item.published">{{ publishedDate }}</span>
              <em v-else>{{ $tr('unpublishedText') }}</em>
            </DetailsRow>
          </template>
          <Details :nodeID="item.root_id" />
        </VCardText>
      </div>
    </VCard>
  </VDialog>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import Vibrant from 'node-vibrant';
  import { RouterNames } from '../../constants';
  import Details from '../../../preview/views/Details';
  import DetailsRow from '../../../preview/views/DetailsRow';
  import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'CatalogDetailsPage',
    components: {
      Details,
      LoadingText,
      DetailsRow,
      CopyToken,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin],
    props: {
      itemID: {
        type: String,
        required: true,
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
      ...mapGetters('catalog', ['getCatalogItem']),
      item() {
        return this.getCatalogItem(this.itemID);
      },
      thumbnail() {
        return this.item.thumbnail_url || '/static/img/kolibri_placeholder.png';
      },
      publishedDate() {
        return this.$formatDate(this.item.last_published, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      backLink() {
        return { name: RouterNames.CATALOG_ITEMS };
      },
      downloadOptions() {
        return [
          {
            title: this.$tr('downloadCSV'),
            href: window.Urls.get_channel_details_csv_endpoint(this.item.id),
          },
          {
            title: this.$tr('downloadDetailedPDF'),
            href: window.Urls.get_channel_details_pdf_endpoint(this.item.id),
          },
          {
            title: this.$tr('downloadPDF'),
            href: window.Urls.get_channel_details_pdf_endpoint(this.item.id) + '?condensed=true',
          },
          {
            title: this.$tr('downloadPPT'),
            href: window.Urls.get_channel_details_ppt_endpoint(this.item.id),
          },
        ];
      },
    },
    mounted() {
      this.load();
    },
    methods: {
      ...mapActions('catalog', ['loadCatalogItem']),
      load() {
        this.loading = true;
        this.loadCatalogItem(this.itemID).then(() => {
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

  .catalog-item-wrapper {
    overflow-y: auto;
    .v-card__text {
      padding-top: 72px;
    }
  }

</style>
