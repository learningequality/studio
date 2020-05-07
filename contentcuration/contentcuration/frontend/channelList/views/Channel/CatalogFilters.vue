<template>

  <div>
    <VBtn
      v-if="$vuetify.breakpoint.xsOnly"
      color="primary"
      flat
      @click.stop="drawer = true"
    >
      {{ $tr('searchText', {count: filtersCount}) }}
    </VBtn>
    <VNavigationDrawer
      v-model="drawer"
      :permanent="$vuetify.breakpoint.smAndUp"
      app
      disable-route-watcher
      :clipped="$vuetify.breakpoint.smAndUp"
      :right="isRTL"
    >
      <VContainer class="filters pa-0">
        <VToolbar color="transparent" flat dense>
          <ActionLink
            :text="$tr('clearFilters')"
            @click="clearFilters"
          />
          <VSpacer />
          <VBtn v-if="$vuetify.breakpoint.xsOnly" icon flat style="text-align: right;">
            <Icon @click="drawer = false">
              clear
            </Icon>
          </VBtn>
        </VToolbar>
        <VForm class="pa-3">

          <!-- Keyword search -->
          <VTextField
            v-model="keywordInput"
            color="primary"
            :label="$tr('searchLabel')"
            single-line
            outline
            clearable
            data-test="keywords"
            autofocus
            @input="setKeywords"
          />

          <!-- Language -->
          <LanguageDropdown
            v-model="languages"
            clearable
            outline
            multiple
          />

          <!-- License (attach to self to keep in notranslate class) -->
          <VSelect
            v-if="!libraryMode"
            v-model="licenses"
            :items="licenseOptions"
            :label="$tr('licenseLabel')"
            item-value="id"
            :item-text="licenseText"
            multiple
            outline
            :menu-props="menuProps"
            class="licenses"
            attach=".licenses"
            @click.stop.prevent
          />

          <!-- Formats (attach to self to keep in notranslate class) -->
          <VSelect
            v-model="kinds"
            :items="kindOptions"
            :item-text="kindText"
            :label="$tr('formatLabel')"
            class="formats"
            attach=".formats"
            multiple
            outline
            :menu-props="menuProps"
          />

          <!-- Starred -->
          <VCheckbox
            v-if="loggedIn"
            v-model="bookmark"
            color="primary"
            :label="$tr('starredLabel')"
          />

          <!-- Includes -->
          <div class="subheading">
            {{ $tr('includesLabel') }}
          </div>
          <VCheckbox v-model="coach" color="primary">
            <template #label>
              {{ $tr('coachLabel') }}
              <HelpTooltip :text="$tr('coachDescription')" bottom class="pl-2" />
            </template>
          </VCheckbox>
          <VCheckbox v-model="assessments" color="primary">
            <template #label>
              {{ $tr('assessmentsLabel') }}
              <HelpTooltip :text="$tr('exerciseDescription')" bottom class="pl-2" />
            </template>
          </VCheckbox>
          <VCheckbox v-model="subtitles" color="primary" :label="$tr('subtitlesLabel')" />
        </VForm>
      </VContainer>
    </VNavigationDrawer>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import map from 'lodash/map';
  import uniq from 'lodash/uniq';
  import reduce from 'lodash/reduce';
  import { RouterNames } from '../../constants';
  import { constantsTranslationMixin } from 'shared/mixins';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import ActionLink from 'shared/views/ActionLink';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { ContentKindsList } from 'shared/leUtils/ContentKinds';
  import { LicensesList } from 'shared/leUtils/Licenses';

  const excludedKinds = new Set(['topic', 'exercise']);

  const includedKinds = ContentKindsList.filter(kind => !excludedKinds.has(kind));

  export default {
    name: 'CatalogFilters',
    components: {
      LanguageDropdown,
      ActionLink,
      HelpTooltip,
    },
    mixins: [constantsTranslationMixin],
    data() {
      return {
        drawer: false,
        keywordInput: '',
      };
    },
    computed: {
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
      isRTL() {
        return window.isRTL;
      },
      libraryMode() {
        return window.libraryMode;
      },
      menuProps() {
        return { offsetY: true, maxHeight: 270 };
      },
      kindOptions() {
        return includedKinds;
      },
      licenseOptions() {
        return LicensesList;
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
      languages: {
        get() {
          let languages = this.$route.query.languages;
          return languages ? languages.split(',') : [];
        },
        set(value) {
          this.setQueryParam('languages', uniq(value).join(','));
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
      setKeywords() {
        return debounce(() => {
          this.setQueryParam('keywords', this.keywordInput);
        }, 500);
      },
    },
    beforeMount() {
      this.keywordInput = this.$route.query.keywords;
    },
    methods: {
      setQueryParam(field, value) {
        let params = this.$route.query;
        if (value) {
          params[field] = value;
        } else {
          delete params[field];
        }
        this.navigate(params);
      },
      clearFilters() {
        this.navigate({});
      },
      navigate(params) {
        this.$router.replace({
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
        return this.translateConstant(kind);
      },
    },
    $trs: {
      clearFilters: 'Clear filters',
      searchLabel: 'Keywords',
      coachLabel: 'Coach content',
      assessmentsLabel: 'Assessments',
      subtitlesLabel: 'Subtitles',
      starredLabel: 'Starred',
      licenseLabel: 'Licenses',
      formatLabel: 'Formats',
      includesLabel: 'Includes',
      searchText:
        '{count, plural,\n =0 {Search} \n =1 {Search (# filter)}\n other {Search (# filters)}}',
      coachDescription: 'Coach content is visible to coaches only in Kolibri',
      exerciseDescription: 'Exercises that have interactive question sets',
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
