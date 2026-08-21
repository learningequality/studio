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
  import { commonStrings } from 'shared/strings/commonStrings';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

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
        const {
          openMenuAction$,
          closeMenuAction$,
          optionsClickableLabel$,
          allOptionsSelectedLabel$,
          allOptionsDeselectedLabel$,
          optionDeselectedLabel$,
          optionSelectedLabel$,
          optionRemovedLabel$,
        } = commonStrings;
        const { clearAllAction$ } = communityChannelsStrings;
        return {
          clearText: clearAllAction$,
          open: openMenuAction$,
          close: closeMenuAction$,
          clickable: optionsClickableLabel$,
          allOptionsSelected: allOptionsSelectedLabel$,
          allOptionsDeselected: allOptionsDeselectedLabel$,
          optionDeselected: optionDeselectedLabel$,
          itemsSelected: ({ count }) => this.$tr('itemsSelected', { count }),
          selected: optionSelectedLabel$,
          removed: optionRemovedLabel$,
          cleared: ({ count }) => this.$tr('selectionsCleared', { count }),
        };
      },
    },
    $trs: {
      languageLabel: 'Languages',
      noMatchingLanguageText: 'No language matches the search',
      itemsSelected: '{count, plural, one {# language selected} other {# languages selected}}',
      selectionsCleared: '{count, plural, one {Cleared # selection} other {Cleared # selections}}',
    },
  };

</script>
