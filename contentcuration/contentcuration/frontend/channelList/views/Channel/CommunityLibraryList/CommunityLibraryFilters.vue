<template>

  <div
    class="filters-container"
    :class="{ disabled }"
  >
    <KTextbox
      v-model="keywordInput"
      clearable
      :label="searchLabel$()"
      :appearanceOverrides="{ maxWidth: '100%' }"
      @input="setKeywords"
    />

    <KSelect
      v-model="countriesFilter"
      :label="countryLabel$()"
      :options="countryOptions"
      :disabled="disabled || !countryOptions.length"
      multiple
      clearable
    />

    <KSelect
      v-model="languagesFilter"
      :label="languagesLabel$()"
      :options="languageOptions"
      :disabled="disabled || !languageOptions.length"
      multiple
      clearable
    />

    <KSelect
      v-model="categoriesFilter"
      :label="categoriesLabel$()"
      :options="categoryOptions"
      :disabled="disabled || !categoryOptions.length"
      multiple
      clearable
    />
  </div>

</template>


<script setup>

  import { injectCommunityChannelsFilters } from './useCommunityChannelsFilters';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  defineProps({
    disabled: {
      type: Boolean,
      default: false,
    },
  });

  const { searchLabel$, countryLabel$, languagesLabel$, categoriesLabel$ } =
    communityChannelsStrings;

  const {
    keywordInput,
    setKeywords,
    countriesFilter,
    countryOptions,
    languagesFilter,
    languageOptions,
    categoriesFilter,
    categoryOptions,
  } = injectCommunityChannelsFilters();

</script>


<style lang="scss" scoped>

  .filters-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
    overflow-y: auto;

    &.disabled {
      pointer-events: none;
      opacity: 0.7;
    }

    ::v-deep .ui-textbox-feedback {
      display: none;
    }
  }

</style>
