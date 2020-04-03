<template>

  <div>
    <VBtn
      v-if="$vuetify.breakpoint.smAndDown"
      color="primary"
      flat
      @click.stop="drawer = true"
    >
      {{ $tr('searchText', {count: filtersCount}) }}
    </VBtn>
    <VNavigationDrawer
      v-model="drawer"
      :permanent="$vuetify.breakpoint.mdAndUp"
      app
      disable-route-watcher
      clipped
      :right="isRTL"
    >
      <div v-if="$vuetify.breakpoint.smAndDown" style="text-align: right;">
        <VBtn icon flat>
          <Icon @click="drawer = false">
            clear
          </Icon>
        </VBtn>
      </div>
      <VContainer class="filters">

        <!-- Keyword search -->
        <VTextField
          :value="keywords"
          color="primary"
          :label="$tr('searchLabel')"
          single-line
          outline
          clearable
          data-test="keywords"
          @blur="setKeywords"
        >
          <template #prepend-inner>
            <Icon>search</Icon>
          </template>
        </VTextField>

        <!-- Show per page -->
        <VSelect
          v-model="pageSize"
          outline
          offset-y
          :items="pageSizeOptions"
          :label="$tr('pageSize')"
        />

        <!-- Language -->
        <LanguageDropdown
          v-model="language"
          clearable
          outline
        />

        <!-- License (attach to self to keep in notranslate class) -->
        <VSelect
          v-model="licenses"
          :items="licenseOptions"
          :label="$tr('licenseLabel')"
          item-value="id"
          :item-text="licenseText"
          multiple
          outline
          offset-y
          class="licenses"
          attach=".licenses"
          @click.stop.prevent
        />

        <!-- Formats (attach to self to keep in notranslate class) -->
        <VSelect
          v-model="kinds"
          :items="kindOptions"
          item-value="kind"
          :item-text="kindText"
          :menu-props="{ maxHeight: '400' }"
          :label="$tr('formatLabel')"
          class="formats"
          attach=".formats"
          multiple
          outline
          offset-y
        />

        <div class="subheading">
          {{ $tr('categoryLabel') }}
        </div>

        <!-- Starred -->
        <VCheckbox
          v-if="loggedIn"
          v-model="bookmark"
          color="primary"
          :label="$tr('starredLabel')"
        />

        <!-- Published -->
        <VCheckbox
          v-model="published"
          color="primary"
          :label="$tr('publishedLabel')"
        />

        <!-- Includes -->
        <div class="subheading">
          {{ $tr('includesLabel') }}
        </div>
        <VCheckbox
          v-model="coach"
          color="primary"
          :label="$tr('coachLabel')"
        />
        <VCheckbox
          v-model="assessments"
          color="primary"
          :label="$tr('assessmentsLabel')"
        />
        <VCheckbox
          v-model="subtitles"
          color="primary"
          :label="$tr('subtitlesLabel')"
        />

      </VContainer>
    </VNavigationDrawer>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
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
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
      isRTL() {
        return window.isRTL;
      },
      kindOptions() {
        return sortBy(Constants.ContentKinds, 'kind');
      },
      licenseOptions() {
        return sortBy(Constants.Licenses, 'id');
      },
      pageSizeOptions() {
        return [5, 10, 25, 50];
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
      pageSize: {
        get() {
          return Number(this.$route.query.page_size) || 25;
        },
        set(value) {
          this.setQueryParam('page_size', value);
        },
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
      bookmark: {
        get() {
          return this.$route.query.bookmark;
        },
        set(value) {
          this.setQueryParam('bookmark', value);
        },
      },
      published: {
        get() {
          return this.$route.query.published;
        },
        set(value) {
          this.setQueryParam('published', value);
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
            page: 1, // Make sure we're on page 1 for every new query

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
      starredLabel: 'Starred',
      licenseLabel: 'Licenses',
      formatLabel: 'Formats',
      includesLabel: 'Includes',
      publishedLabel: 'Available to download',
      categoryLabel: 'Category',
      searchText:
        '{count, plural,\n =0 {Search} \n =1 {Search (# filter)}\n other {Search (# filters)}}',
      pageSize: 'Show per page',
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
  .filters {
    width: 100%;
    height: inherit;
    overflow: auto;
  }

</style>
