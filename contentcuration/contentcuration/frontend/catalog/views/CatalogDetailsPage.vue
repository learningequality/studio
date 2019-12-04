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
        <v-layout row wrap>
          <v-flex
            xs12
            sm6
            md4
            lg3
            xl2
            class="primary-panel"
          >
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
            <div v-if="item.channel">
              <p class="subheading subheader">
                {{ $tr('sizeHeading') }}
              </p>
              <div class="detail-value">
                {{ sizeText }}
              </div>

              <p class="subheading subheader">
                {{ $tr('resourceHeading') }}
              </p>
              <div class="detail-value">
                {{ $formatNumber(item.details.resource_count) }}
              </div>

              <p class="subheading subheader">
                {{ $tr('coachHeading') }}
              </p>
              <div class="detail-value">
                <v-icon color="primary">
                  local_library
                </v-icon>
                    &nbsp;
                {{ $formatNumber(item.coach_count) }}
              </div>

              <template v-if="item.channel && item.channel.language || item.language">
                <p class="subheading subheader">
                  {{ $tr('primaryLanguageHeading') }}
                </p>
                <div class="detail-value">
                  {{ translateLanguage(item.channel.language || item.language) }}
                </div>
              </template>

              <p class="subheading subheader">
                {{ $tr('creationHeading') }}
              </p>
              <div class="detail-value">
                {{ createdDate }}
              </div>

            </div>
          </v-flex>
          <v-flex
            xs12
            sm6
            md8
            lg9
            xl10
            class="secondary-panel"
            :style="{paddingLeft: $vuetify.breakpoint.smAndUp? '48px': '0'}"
          >
            <div v-if="hasDetails">
              <div class="tags-area">
                <v-chip
                  v-for="tag in item.details.tags"
                  :key="tag.tag_name"
                  dark
                  :color="dominantColor"
                >
                  {{ tag.tag_name }}
                </v-chip>
              </div>

              <p class="subheading subheader">
                {{ $tr('containsHeading') }}
              </p>

              <!-- Using a table here instead of a list as the counts are better aligned -->
              <v-data-table :items="kindCount" hide-actions hide-headers>
                <template v-slot:items="props">
                  <td>
                    <ContentNodeIcon :kind="props.item.kind_id" />
                    <span>{{ translateConstant(props.item.kind_id) }}</span>
                  </td>
                  <td>{{ $formatNumber(props.item.count) }}</td>
                  <td v-if="$vuetify.breakpoint.mdAndUp"></td>
                  <td v-if="$vuetify.breakpoint.lgAndUp"></td>
                </template>
              </v-data-table>
              <br>

              <v-layout row wrap>
                <v-flex v-if="item.details.languages.length" xs12 sm6>
                  <p class="subheading subheader">
                    {{ $tr('languagesHeading') }}
                  </p>
                  <ExpandableList :items="item.details.languages" />
                </v-flex>
                <v-flex v-if="item.details.accessible_languages.length" xs12 sm6>
                  <p class="subheading subheader">
                    {{ $tr('subtitlesHeading') }}
                  </p>
                  <ExpandableList :items="item.details.accessible_languages" />
                </v-flex>
              </v-layout>
            </div>
          </v-flex>
          <v-flex v-if="hasDetails" xs12>
            <br><br>
            <v-layout row wrap>
              <v-flex v-for="(node, index) in item.details.sample_nodes" :key="index" xs6 sm3>
                <VImg :src="node.thumbnail" :aspect-ratio="16/9" />
              </v-flex>
            </v-layout>
            <br>
            <v-layout row wrap class="auth-row">
              <v-flex xs12 sm3 md2 xl1>
                <label>{{ $tr('authorsLabel') }}</label>
              </v-flex>
              <v-flex xs12 sm9 md10 xl11>
                <ExpandableList
                  v-if="item.details.authors.length"
                  :items="item.details.authors"
                  inline
                />
              </v-flex>
            </v-layout>
            <v-layout row wrap class="auth-row">
              <v-flex xs12 sm3 md2 xl1>
                <label>{{ $tr('providersLabel') }}</label>
              </v-flex>
              <v-flex xs12 sm9 md10 xl11>
                <ExpandableList
                  :items="item.details.providers"
                  inline
                  :no-items-text="$tr('notAvailable')"
                />
              </v-flex>
            </v-layout>
            <v-layout row wrap class="auth-row">
              <v-flex xs12 sm3 md2 xl1>
                <label>{{ $tr('aggregatorsLabel') }}</label>
              </v-flex>
              <v-flex xs12 sm9 md10 xl11>
                <ExpandableList
                  :items="item.details.aggregators"
                  :no-items-text="$tr('notAvailable')"
                  inline
                />
              </v-flex>
            </v-layout>
            <v-layout row wrap class="auth-row">
              <v-flex xs12 sm3 md2 xl1>
                <label>{{ $tr('licensesLabel') }}</label>
              </v-flex>
              <v-flex xs12 sm9 md10 xl11>
                <ExpandableList
                  :items="item.details.licenses"
                  :no-items-text="$tr('notAvailable')"
                  inline
                />
              </v-flex>
            </v-layout>
            <v-layout row wrap class="auth-row">
              <v-flex xs12 sm3 md2 xl1>
                <label>{{ $tr('copyrightHoldersLabel') }}</label>
              </v-flex>
              <v-flex xs12 sm9 md10 xl11>
                <ExpandableList
                  :items="item.details.copyright_holders"
                  :noItemsText="$tr('notAvailable')"
                  inline
                />
              </v-flex>
            </v-layout>
          </v-flex>
        </v-layout>
      </v-container>
    </div>
  </div>

</template>

<script>

  import _ from 'lodash';
  import Vibrant from 'node-vibrant';
  import { fileSizeMixin, constantsTranslationMixin } from '../mixins';
  import { SCALE_TEXT, SCALE, CHANNEL_SIZE_DIVISOR } from '../constants';
  import LoadingText from './LoadingText';
  import ExpandableList from './ExpandableList';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon';
  import client from 'shared/client';

  export default {
    name: 'CatalogDetailsPage',
    components: {
      LoadingText,
      ContentNodeIcon,
      ExpandableList,
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
      sizeText() {
        let size = (this.item.details && this.item.details.resource_size) || 0;
        const sizeIndex = Math.max(
          1,
          Math.min(Math.ceil(Math.log(size / CHANNEL_SIZE_DIVISOR) / Math.log(2)), 10)
        );
        return this.$tr('sizeText', {
          text: this.$tr(SCALE[sizeIndex]),
          size: this.formatFileSize(size),
        });
      },
      kindCount() {
        return _.sortBy(this.item.details.kind_count, ['-count', 'kind_id']);
      },
      createdDate() {
        return this.$formatDate(this.item.channel.created, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      hasDetails() {
        return Object.keys(this.item.details).length;
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
      sizeHeading: 'Channel size',
      sizeText: '{text} ({size})',
      resourceHeading: 'Total resources',
      coachHeading: 'Coach resources',
      primaryLanguageHeading: 'Primary language',
      creationHeading: 'Creation date',
      containsHeading: 'Contains',
      languagesHeading: 'Languages',
      subtitlesHeading: 'Subtitles',
      authorsLabel: 'Authors',
      providersLabel: 'Providers',
      aggregatorsLabel: 'Aggregators',
      licensesLabel: 'Licenses',
      copyrightHoldersLabel: 'Copyright Holders',
      [SCALE_TEXT.VERY_SMALL]: 'Very Small',
      [SCALE_TEXT.SMALL]: 'Small',
      [SCALE_TEXT.AVERAGE]: 'Average',
      [SCALE_TEXT.LARGE]: 'Large',
      [SCALE_TEXT.VERY_LARGE]: 'Very Large',
      notAvailable: 'Information not available',
      draftChannel: 'Coming soon!',
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
  }

</style>
