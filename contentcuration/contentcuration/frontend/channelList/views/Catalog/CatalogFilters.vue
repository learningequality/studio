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

    <!-- View -->
    <v-select
      v-model="filters.view"
      :items="catalogTypes"
      :label="$tr('filterLabel')"
      item-text="text"
      item-value="key"
      single-line
      outline
    />

    <!-- Language -->
    <LanguageDropdown
      v-model="filters.language"
      single-line
      outline
    />

    <!-- License -->
    <v-select
      :items="licenses"
      :label="$tr('licenseLabel')"
      item-value="id"
      single-line
      outline
    >
      <template v-slot:selection="{ item, index }">
        {{ translateConstant(item.license_name) }}
      </template>
      <template v-slot:item="{ item, index }">
        {{ translateConstant(item.license_name) }}
      </template>
    </v-select>

    <!-- Types -->
    <div class="subheading">
      Type
    </div>
    <v-checkbox
      v-for="kind in kinds"
      :key="kind.kind"
      v-model="filters.formats[kind.kind]"
      color="primary"
      :label="translateConstant(kind.kind)"
      single-line
    />

    <!-- Includes -->
    <div class="subheading">
      Includes
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
          formats: {},
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
      catalogTypes() {
        return [
          { key: 'all', text: this.$tr('allLabel') },
          { key: 'drafts', text: this.$tr('draftsLabel') },
          { key: 'available', text: this.$tr('availableLabel') },
          { key: 'picks', text: this.$tr('picksLabel') },
        ];
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
      search() {
        // console.log('SEARCHING', this.filters, this.keywords);
      },
    },
    $trs: {
      searchLabel: 'Keywords',
      coachLabel: 'Coach content',
      assessmentsLabel: 'Assessments',
      subtitlesLabel: 'Subtitles',
      filterLabel: 'View',
      allLabel: 'All',
      draftsLabel: 'Coming Soon',
      availableLabel: 'Available',
      picksLabel: 'Learning Equality Picks',
      licenseLabel: 'License',
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
