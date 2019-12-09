<template>

  <v-container>
    <!-- Keyword search -->
    <v-text-field
      v-model="keywords"
      color="primary"
      :label="$tr('searchLabel')"
      prepend-inner-icon="search"
      single-line
      outline
    />

    <!-- Language -->
    <LanguageDropdown
      v-model="filters.language"
      outline
    />

    <!-- License -->
    <v-select
      v-model="filters.licenses"
      :items="licenses"
      :label="$tr('licenseLabel')"
      item-value="id"
      :item-text="licenseText"
      multiple
      outline
    />

    <!-- Formats -->
    <v-select
      v-model="filters.kinds"
      :items="kinds"
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
      v-model="filters.includes.coach"
      color="primary"
      :label="$tr('coachLabel')"
    />
    <v-checkbox
      v-model="filters.includes.assessments"
      color="primary"
      :label="$tr('assessmentsLabel')"
    />
    <v-checkbox
      v-model="filters.includes.subtitles"
      color="primary"
      :label="$tr('subtitlesLabel')"
    />

  </v-container>

</template>


<script>

  import { mapActions } from 'vuex';
  import debounce from 'lodash/debounce';
  import sortBy from 'lodash/sortBy';
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
        filters: {
          kinds: [],
          licenses: [],
          includes: {},
        },
        keywords: '',
      };
    },
    computed: {
      kinds() {
        return sortBy(Constants.ContentKinds, 'kind');
      },
      licenses() {
        return sortBy(Constants.Licenses, 'id');
      },
      debouncedSearch() {
        return debounce(this.search, 1000);
      },
    },
    watch: {
      keywords() {
        this.debouncedSearch();
      },
      filters: {
        deep: true,
        handler() {
          this.search();
        },
      },
    },
    methods: {
      ...mapActions('catalog', ['searchCatalog']),
      licenseText(license) {
        return this.translateConstant(license.license_name);
      },
      kindText(kind) {
        return this.translateConstant(kind.kind);
      },
      search() {
        this.searchCatalog({
          ...this.filters,
          keywords: this.keywords,
        });
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
