<template>

  <div>
    <LoadingText v-if="loading" />
    <div v-else-if="item">
      <v-toolbar flat dark :color="dominantColor">
        <v-toolbar-items>
          <v-btn flat icon :to="{name: 'CatalogList'}">
            <v-icon>arrow_back</v-icon>
          </v-btn>
        </v-toolbar-items>
        <v-spacer />
        <v-toolbar-title>{{ item.channel && item.channel.name || item.name }}</v-toolbar-title>
      </v-toolbar>
      <v-container fluid>
        <v-layout>
          <v-spacer />
          <v-btn flat color="primary">
            Download
          </v-btn>
        </v-layout>
        <VImg
          :src="item.thumbnail_url || '/static/img/kolibri_placeholder.png'"
          :aspect-ratio="16/9"
          max-width="300"
        />
        <br>
        <h1>{{ item.channel && item.channel.name || item.name }}</h1>
        <h2 v-if="!item.channel" class="draft-header">
          {{ $tr('draftChannel') }}
        </h2>
        <p>{{ item.description }}</p>
        <br>

        <DetailsRow
          :label="$tr('primaryLanguageHeading')"
          :text="translateLanguage(item.channel.language || item.language)"
        />

        <template v-if="item.channel">
          <DetailsRow v-if="item.channel.published" :label="$tr('tokenHeading')">
            <template v-slot>
              <CopyToken
                :token="item.channel.primary_token"
                style="max-width:max-content;"
              />
            </template>
          </DetailsRow>
          <DetailsRow :label="$tr('publishedHeading')">
            <span v-if="item.channel.published">{{ publishedDate }}</span>
            <em v-else>$tr('unpublishedText')</em>
          </DetailsRow>
        </template>
        <Details :nodeID="item.channel.main_tree" />
      </v-container>
    </div>
  </div>

</template>

<script>

  import Vibrant from 'node-vibrant';
  import { fileSizeMixin, constantsTranslationMixin } from '../../shared/mixins';
  import LoadingText from '../../shared/views/LoadingText';
  import CopyToken from '../../shared/views/CopyToken';
  import Details from '../../preview/views/Details';
  import DetailsRow from '../../preview/views/DetailsRow';
  import client from 'shared/client';

  export default {
    name: 'CatalogDetailsPage',
    components: {
      Details,
      LoadingText,
      DetailsRow,
      CopyToken,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin],
    data() {
      return {
        loading: false,
        item: null,
        loadError: false,
        dominantColor: 'primary',
      };
    },
    computed: {
      thumbnail() {
        return this.item.thumbnail_url || '/static/img/kolibri_placeholder.png';
      },
      publishedDate() {
        return this.$formatDate(this.item.channel.last_published, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
    },
    mounted() {
      this.loadCatalogChannel();
    },
    methods: {
      loadCatalogChannel() {
        this.loading = true;
        return client
          .get(window.Urls.get_catalog_details(this.$route.params.itemID))
          .then(response => {
            this.item = response.data;

            let v = new Vibrant(this.thumbnail);
            v.getPalette((err, palette) => {
              if (!err && palette && palette.DarkVibrant) {
                this.dominantColor = palette ? palette.DarkVibrant.getHex() : 'primary';
              }
              this.loading = false;
            });
          })
          .catch(() => {
            this.loading = false;
            this.loadError = true;
          });
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      tokenHeading: 'Channel Token',
      idHeading: 'Channel ID',
      publishedHeading: 'Published date',
      primaryLanguageHeading: 'Primary language',
      draftChannel: 'Coming soon!',
      unpublishedText: 'Unpublished',
    },
  };

</script>


<style lang="less" scoped>

  .v-toolbar__title {
    font-weight: bold;
  }

  .draft-header {
    color: gray;
  }
  .subheader {
    margin-top: 20px;
    margin-bottom: 0;
    font-size: 10pt !important;
    font-weight: bold;
    color: gray;
  }

  .detail-value {
    font-size: 14pt;
    font-weight: bold;
  }

  .v-chip {
    padding: 0 8px;
    font-weight: bold;
    border-radius: 10px;
  }

  /deep/ .v-datatable tr {
    border-bottom: 0 !important;
    td {
      font-size: 12pt;
      span {
        margin-left: 20px;
      }
    }
  }

  .auth-row {
    margin-bottom: 16px;
    label {
      font-weight: bold;
    }
    .flex:last-child {
      padding-left: 10px;
    }
  }

</style>
