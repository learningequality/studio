<template>

  <KMultiSelect
    v-model="languages"
    :options="availableLanguages"
    :label="$tr('languageLabel')"
    itemValue="id"
    itemText="name"
    :searchKeys="['related_names', 'id']"
    :multiple="true"
    clearable
    :noResultsText="$tr('noMatchingLanguageText')"
    :messages="messages"
  />

</template>


<script>

  import KMultiSelect from 'kolibri-design-system/lib/candidate/multiselect/KMultiSelect';
  import LanguagesMap, { LanguagesList } from 'shared/leUtils/Languages';

  const publicLanguages = Object.entries(window.publicLanguages || {}).map(([langId, count]) => {
    const baseLanguage = LanguagesMap.get(langId);
    return {
      id: langId,
      name: baseLanguage.native_name,
      count: count,
      related_names: LanguagesList.filter(lang => lang.lang_code === langId)
        .map(lang => [lang.native_name, lang.id, lang.readable_name])
        .flat(),
    };
  });

  export default {
    name: 'LanguageFilter',
    components: {
      KMultiSelect,
    },
    props: {
      value: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        availableLanguages: publicLanguages,
      };
    },
    computed: {
      languages: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value.filter(Boolean));
        },
      },
      messages() {
        return {
          clearText: () => this.$tr('clearText'),
          open: () => this.$tr('openMenu'),
          close: () => this.$tr('closeMenu'),
          clickable: () => this.$tr('optionsClickable'),
          allOptionsSelected: () => this.$tr('allOptionsSelected'),
          allOptionsDeselected: () => this.$tr('allOptionsDeselected'),
          optionDeselected: () => this.$tr('optionDeselected'),
          itemsSelected: ({ count }) => this.$tr('itemsSelected', { count }),
          selected: ({ label }) => this.$tr('languageSelected', { label }),
          removed: ({ label }) => this.$tr('languageRemoved', { label }),
          cleared: ({ count }) => this.$tr('selectionsCleared', { count }),
        };
      },
    },
    $trs: {
      languageLabel: 'Languages',
      noMatchingLanguageText: 'No language matches the search',
      clearText: 'Clear all',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      optionsClickable: 'Options are clickable',
      allOptionsSelected: 'All options selected',
      allOptionsDeselected: 'No options selected',
      optionDeselected: 'Option deselected',
      itemsSelected: '{count, plural, one {# language selected} other {# languages selected}}',
      languageSelected: 'Selected {label}',
      languageRemoved: 'Removed {label}',
      selectionsCleared: '{count, plural, one {Cleared # selection} other {Cleared # selections}}',
    },
  };

</script>
