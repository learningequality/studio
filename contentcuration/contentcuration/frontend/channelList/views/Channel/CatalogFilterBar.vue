<template>

  <p>
    <VChip
      v-for="(filter, index) in currentFilters"
      :key="`catalog-filter-${index}`"
      close
      class="ma-1"
      @input="filter.onclose"
    >
      {{ filter.text }}
    </VChip>
    <ActionLink
      v-if="currentFilters.length"
      class="ml-2"
      :text="$tr('clearAll')"
      @click="clearFilters"
    />
  </p>

</template>

<script>

  import { catalogFilterMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import ActionLink from 'shared/views/ActionLink';

  /*
    Returns the expected format for filters
    {
      text: string to display for filter
      onclose: action to do if filter is removed
    }
  */
  function createFilter(value, text, onclose) {
    return value ? { text, onclose } : false;
  }

  export default {
    name: 'CatalogFilterBar',
    components: {
      ActionLink,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],
    computed: {
      currentFilters() {
        return [
          // Keywords
          createFilter(
            this.keywords,
            this.$tr('keywords', { text: this.keywords }),
            this.resetKeywords
          ),

          // Languages
          this.languages.map(language =>
            createFilter(language, this.translateLanguage(language), () =>
              this.removeLanguage(language)
            )
          ),

          // Licenses
          this.licenses.map(license =>
            createFilter(license, this.translateConstant(license), () =>
              this.removeLicense(license)
            )
          ),

          // Kinds
          this.kinds.map(kind =>
            createFilter(kind, this.translateConstant(kind), () => this.removeKind(kind))
          ),

          // Includes
          createFilter(this.bookmark, this.$tr('starred'), this.resetBookmark),
          createFilter(this.coach, this.$tr('coachContent'), this.resetCoach),
          createFilter(this.assessments, this.$tr('assessments'), this.resetAssessments),
          createFilter(this.subtitles, this.$tr('subtitles'), this.resetSubtitles),
        ]
          .flat()
          .filter(Boolean);
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
<style lang="less" scoped>

</style>
