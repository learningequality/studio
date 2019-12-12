<template>

  <div>
    <v-btn
      v-if="$vuetify.breakpoint.smAndDown"
      color="primary"
      flat
      @click.stop="drawer = true"
    >
      {{ $tr('searchText', {count: filtersCount}) }}
    </v-btn>
    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.breakpoint.mdAndUp"
      app
      disable-route-watcher
      clipped
    >
      <div v-if="$vuetify.breakpoint.smAndDown" style="text-align: right;">
        <v-btn icon flat>
          <v-icon @click="drawer = false">
            clear
          </v-icon>
        </v-btn>
      </div>
      <v-container>
        <!-- Keyword search -->
        <v-text-field
          :value="keywords"
          color="primary"
          :label="$tr('searchLabel')"
          single-line
          outline
          clearable
          prepend-inner-icon="search"
          @blur="setKeywords"
        />

        <!-- Language -->
        <LanguageDropdown
          v-model="language"
          clearable
          outline
        />

        <!-- License -->
        <v-select
          v-model="licenses"
          :items="licenseOptions"
          :label="$tr('licenseLabel')"
          item-value="id"
          :item-text="licenseText"
          multiple
          outline
          @click.stop.prevent
        />

        <!-- Formats -->
        <v-select
          v-model="kinds"
          :items="kindOptions"
          item-value="kind"
          :item-text="kindText"
          :menu-props="{ maxHeight: '400' }"
          :label="$tr('formatLabel')"
          multiple
          outline
        />

        <!-- Includes -->
        <div class="subheading">
          {{ $tr('includesLabel') }}
        </div>
        <v-checkbox
          v-model="coach"
          color="primary"
          :label="$tr('coachLabel')"
        />
        <v-checkbox
          v-model="assessments"
          color="primary"
          :label="$tr('assessmentsLabel')"
        />
        <v-checkbox
          v-model="subtitles"
          color="primary"
          :label="$tr('subtitlesLabel')"
        />

      </v-container>
    </v-navigation-drawer>
  </div>

</template>


<script>

  import map from 'lodash/map';
  import uniq from 'lodash/uniq';
  import reduce from 'lodash/reduce';
  import sortBy from 'lodash/sortBy';
  import { RouterNames } from '../../constants';
  import { constantsTranslationMixin } from 'shared/mixins';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'CatalogFilters',
    components: {
      LanguageDropdown,
    },
    mixins: [constantsTranslationMixin],
    data() {
      return {
        drawer: false,
      };
    },
    computed: {
      kindOptions() {
        return sortBy(Constants.ContentKinds, 'kind');
      },
      licenseOptions() {
        return sortBy(Constants.Licenses, 'id');
      },
      filtersCount() {
        let fields = [
          this.keywords,
          this.language,
          this.licenses.length,
          this.kinds.length,
          this.coach,
          this.assessments,
          this.subtitles,
        ];
        return reduce(
          fields,
          (sum, item) => {
            return sum + Number(Boolean(item));
          },
          0
        );
      },
      keywords() {
        return this.$route.query.keywords;
      },
      language: {
        get() {
          return this.$route.query.language;
        },
        set(value) {
          this.setQueryParam('language', value);
        },
      },
      licenses: {
        get() {
          let licenses = this.$route.query.licenses;
          return licenses
            ? map(licenses.split(','), l => {
                return Number(l);
              })
            : [];
        },
        set(value) {
          this.setQueryParam('licenses', uniq(value).join(','));
        },
      },
      kinds: {
        get() {
          let kinds = this.$route.query.kinds;
          return kinds ? kinds.split(',') : [];
        },
        set(value) {
          this.setQueryParam('kinds', uniq(value).join(','));
        },
      },
      coach: {
        get() {
          return this.$route.query.coach;
        },
        set(value) {
          this.setQueryParam('coach', value);
        },
      },
      assessments: {
        get() {
          return this.$route.query.assessments;
        },
        set(value) {
          this.setQueryParam('assessments', value);
        },
      },
      subtitles: {
        get() {
          return this.$route.query.subtitles;
        },
        set(value) {
          this.setQueryParam('subtitles', value);
        },
      },
    },
    methods: {
      setKeywords(event) {
        this.setQueryParam('keywords', event.target.value);
      },
      setQueryParam(field, value) {
        let params = this.$route.query;
        if (value) {
          params[field] = value;
        } else {
          delete params[field];
        }

        this.$router.push({
          ...this.$route,
          name: RouterNames.CATALOG_LIST,
          query: {
            ...params,
            // Getting NavigationDuplicated for any query,
            // so just get a unique string to make it always unique
            query_id: Math.random()
              .toString(36)
              .substring(7),
          },
        });
      },
      licenseText(license) {
        return this.translateConstant(license.license_name);
      },
      kindText(kind) {
        return this.translateConstant(kind.kind);
      },
    },
    $trs: {
      searchLabel: 'Keywords',
      coachLabel: 'Coach content',
      assessmentsLabel: 'Assessments',
      subtitlesLabel: 'Subtitles',
      licenseLabel: 'Licenses',
      formatLabel: 'Formats',
      includesLabel: 'Includes',
      searchText:
        '{count, plural,\n =0 {Search} \n =1 {Search (# filter)}\n other {Search (# filters)}}',
    },
  };

</script>


<style lang="less" scoped>

  .v-input--checkbox {
    margin: 0;
  }
  /deep/ .v-messages {
    display: none;
  }

  .subheading {
    margin-top: 20px;
    margin-bottom: 5px;
    font-weight: bold;
    color: gray;
  }

</style>
