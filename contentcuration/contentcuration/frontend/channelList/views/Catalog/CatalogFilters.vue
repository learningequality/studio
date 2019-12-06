<template>

  <v-container>
    <!-- Keyword search -->
    <v-text-field
      v-model="filters.keywords"
      color="primary"
      :label="$tr('searchLabel')"
      prepend-inner-icon="search"
      single-line
      outline
    />

    <!-- View -->
    <v-select
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
      :label="translateKind(kind.kind)"
      single-line
    />

    <!-- Includes -->
    <div class="subheading">
      Includes
    </div>
    <v-checkbox
      v-model="filters.coach"
      color="primary"
      :label="$tr('coachLabel')"
    />
    <v-checkbox
      v-model="filters.assessments"
      color="primary"
      :label="$tr('assessmentsLabel')"
    />
    <v-checkbox
      v-model="filters.assessments"
      color="primary"
      :label="$tr('subtitlesLabel')"
    />
  </v-container>

</template>


<script>

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
        },
      };
    },
    computed: {
      kinds() {
        return Constants.ContentKinds;
      },
      catalogTypes() {
        return [
          { key: 'all', text: this.$tr('allLabel') },
          { key: 'drafts', text: this.$tr('draftsLabel') },
          { key: 'available', text: this.$tr('availableLabel') },
          { key: 'picks', text: this.$tr('picksLabel') },
        ];
      },
      licenses() {
        return Constants.Licenses;
      },
    },
    methods: {
      translateKind(kind) {
        switch (kind) {
          case 'topic':
            return this.$tr('topic');
          case 'video':
            return this.$tr('video');
          case 'audio':
            return this.$tr('audio');
          case 'slideshow':
            return this.$tr('slideshow');
          case 'exercise':
            return this.$tr('exercise');
          case 'document':
            return this.$tr('document');
          case 'html5':
            return this.$tr('html5');
          default:
            return this.$tr('unsupported');
        }
      },
    },
    $trs: {
      searchLabel: 'Keywords',
      topic: 'Topic',
      video: 'Video',
      audio: 'Audio',
      exercise: 'Exercise',
      document: 'Document',
      slideshow: 'Slideshow',
      html5: 'HTML5 App',
      unsupported: 'Unsupported',
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
