<template>

  <div>
    <VSelect
      v-if="kindFilterOptions.length > 0"
      :label="$tr('kindLabel')"
      multiple
      :items="kindFilterOptions"
      :value="kindFilters.map(convertToValue)"
      @change="handleTypeFilterChange"
    />

    <VCheckbox
      :label="$tr('hideTopicsLabel')"
    />

    <VSelect
      :label="$tr('channelSourceLabel')"
      multiple
      :items="channelFilterOptions"
    />

    <VSelect
      v-if="languageFilterOptions.length > 0"
      :label="$tr('languageLabel')"
      multiple
      :items="languageFilterOptions"
      :value="languageFilters.map(convertToValue)"
      @change="handleLanguageFilterChange"
    />

    <VSelect
      :label="$tr('licensesLabel')"
      multiple
      :items="[]"
    />

    <VSelect
      :label="$tr('authorLabel')"
      multiple
      :items="[]"
    />

    <!-- Show coach content toggle -->
    <VCheckbox>
      <template v-slot:label>
        <VIcon class="mr-1">
          local_library
        </VIcon>
        {{ $tr('coachContentLabel') }}
      </template>
    </VCheckbox>

    <fieldset class="fieldset-reset">
      {{ $tr('addedAfterDateLabel') }}
      <VSelect :label="$tr('monthLabel')" />
      <VSelect :label="$tr('yearLabel')" />
    </fieldset>

    <VSelect :label="$tr('tagsLabel')" multiple :items="[]" />

  </div>

</template>


<script>

  import countBy from 'lodash/countBy';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'SearchFilters',
    mixins: [constantsTranslationMixin],
    props: {
      searchResults: {
        type: Array,
        required: true,
      },
      kindFilters: {
        type: Array,
        required: true,
      },
      languageFilters: {
        type: Array,
        required: true,
      },
    },
    computed: {
      kindFilterOptions() {
        return Object.keys(this.kindFilterCounts).map(kind => ({
          text: this.translateConstant(kind),
          value: kind,
        }));
      },
      channelFilterOptions() {
        return [];
      },
      languageFilterOptions() {
        return Object.keys(this.languageFilterCounts)
          .filter(key => key)
          .map(language => ({
            text: this.translateConstant(language) || this.$tr('unknownLabel'),
            value: String(language),
          }));
      },
      kindFilterCounts() {
        return countBy(this.searchResults, result => result.kind);
      },
      languageFilterCounts() {
        return countBy(this.searchResults, result => String(result.language));
      },
    },
    methods: {
      handleTypeFilterChange(newVal) {
        this.$emit(
          'update:kindFilters',
          newVal.map(filter => ({
            key: filter,
            type: 'kind',
            results: this.kindFilterCounts[filter] || 0,
          }))
        );
      },
      handleLanguageFilterChange(newVal) {
        this.$emit(
          'update:languageFilters',
          newVal.map(filter => ({
            key: filter,
            type: 'language',
            results: this.languageFilterCounts[filter],
          }))
        );
      },
      convertToValue(filter) {
        return {
          value: filter.key,
        };
      },
    },
    $trs: {
      kindLabel: 'Type/format',
      hideTopicsLabel: 'Hide topics',
      channelSourceLabel: 'Channel/source',
      languageLabel: 'Language',
      licensesLabel: 'Licenses',
      authorLabel: 'Author',
      coachContentLabel: 'Show coach content',
      addedAfterDateLabel: 'Added after',
      monthLabel: 'Month',
      yearLabel: 'Year',
      tagsLabel: 'Tags',
      unknownLabel: 'Unknown',
    },
  };

</script>


<style lang="less" scoped>

  .fieldset-reset {
    border-style: none;
  }

</style>
