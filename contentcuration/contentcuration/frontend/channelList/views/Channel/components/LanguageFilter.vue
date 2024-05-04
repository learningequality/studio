<template>

  <VAutocomplete
    v-model="languages"
    :items="availableLanguages"
    :label="$tr('languageLabel')"
    color="primary"
    item-value="id"
    :item-text="languageSearchValue"
    autoSelectFirst
    :no-data-text="$tr('noMatchingLanguageText')"
    box
    multiple
    clearable
    :search-input.sync="languageInput"
    v-bind="$attrs"
    @change="languageInput = ''"
  >
    <template #selection="{ item }">
      <VTooltip bottom lazy>
        <template #activator="{ on }">
          <VChip class="ma-1" v-on="on">
            <div class="text-truncate">
              {{ item.name }}
            </div>
          </VChip>
        </template>
        <span>{{ item.name }}</span>
      </VTooltip>
    </template>
    <template #item="{ item }">
      <Checkbox :key="item.id" :input-value="value" :value="item.id" class="mt-0">
          <VTooltip bottom lazy>
            <template #activator="{ on }">
              <div class="text-truncate" style="width: 250px;" v-on="on">
                {{ item.name }}
              </div>
            </template>
            <span>{{ item.name }}</span>
          </VTooltip>
      </Checkbox>
    </template>
  </VAutocomplete>

</template>


<script>

  import Checkbox from 'shared/views/form/Checkbox';
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
      Checkbox,
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
        languageInput: '',
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
    },
    methods: {
      languageSearchValue(item) {
        return item.name;
      },
    },
    $trs: {
      languageLabel: 'Languages',
      noMatchingLanguageText: 'No language matches the search',
    },
  };

</script>

<style lang="less" scoped>

  // Need to set otherwise chips will exceed width of selection box

  /deep/ .v-select__selections {
    width: calc(100% - 48px);
  }

  .v-chip,
  /deep/ .v-chip__content,
  .text-truncate {
    max-width: 100%;
  }

</style>
