<template>

  <div class="filter-bar-container">
    <div v-if="currentFilters.length" class="filter-bar-content">
      <StudioChip
        v-for="(filter, index) in currentFilters"
        :key="`catalog-filter-${index}`"
        :class="{ notranslate: filter.notranslate }"
        :text="filter.text"
        :close="true"
        :data-test="`filter-chip-${index}`"
        @close="filter.onclose"
      />
      <KButton
        v-if="currentFilters.length"
        class="clear-link"
        :text="$tr('clearAll')"
        appearance="basic-link"
        data-testid="clear"
        @click="clearFilters"
      />
    </div>
  </div>

</template>


<script>

  import flatten from 'lodash/flatten';
  import { catalogFilterMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import StudioChip from 'shared/views/StudioChip';

  function createFilter(value, text, onclose, notranslate = false) {
    return value ? { text, onclose, notranslate } : false;
  }

  export default {
    name: 'CatalogFilterBar',
    components: {
      StudioChip,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],
    computed: {
      currentFilters() {
        return flatten([
          createFilter(
            this.keywords,
            this.$tr('keywords', { text: this.keywords }),
            this.resetKeywords,
            true
          ),
          this.languages.map(language =>
            createFilter(language, this.translateLanguage(language), () =>
              this.removeLanguage(language)
            )
          ),
          this.licenses.map(license =>
            createFilter(license, this.translateLicense(license), () =>
              this.removeLicense(license)
            )
          ),
          this.kinds.map(kind =>
            createFilter(kind, this.translateConstant(kind), () => this.removeKind(kind))
          ),
          createFilter(this.bookmark, this.$tr('starred'), this.resetBookmark),
          createFilter(this.coach, this.$tr('coachContent'), this.resetCoach),
          createFilter(this.assessments, this.$tr('assessments'), this.resetAssessments),
          createFilter(this.subtitles, this.$tr('subtitles'), this.resetSubtitles),
        ]).filter(Boolean);
      },
    },
    methods: {
      resetKeywords() {
        this.keywords = '';
      },
      removeLanguage(language) {
        this.languages = this.languages.filter(l => l !== language);
      },
      removeLicense(license) {
        this.licenses = this.licenses.filter(l => l !== license);
      },
      removeKind(kind) {
        this.kinds = this.kinds.filter(k => k !== kind);
      },
      resetBookmark() {
        this.bookmark = false;
      },
      resetCoach() {
        this.coach = false;
      },
      resetAssessments() {
        this.assessments = false;
      },
      resetSubtitles() {
        this.subtitles = false;
      },
    },
    $trs: {
      keywords: '"{text}"',
      coachContent: 'Coach content',
      assessments: 'Assessments',
      subtitles: 'Subtitles',
      starred: 'Starred',
      clearAll: 'Clear all',
    },
  };

</script>


<style lang="scss" scoped>

  .filter-bar-container {
    max-width: 1128px;
    padding: 16px;
    margin: 0 auto;
  }

  .filter-bar-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .clear-link {
    margin: 0 8px;
  }

</style>
