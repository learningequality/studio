<template>

  <VAutocomplete
    v-model="language"
    class="language-dropdown"
    v-bind="$attrs"
    :items="languages"
    :label="$tr('labelText')"
    color="primary"
    itemValue="id"
    :itemText="languageText"
    autoSelectFirst
    :allowOverflow="false"
    persistentHint
    :rules="rules"
    :required="required"
    :no-data-text="$tr('noDataText')"
  />

</template>


<script>

  import { Languages } from 'shared/constants';

  export default {
    name: 'LanguageDropdown',
    props: {
      value: {
        type: String,
        required: false,
        validator: function(value) {
          return !value || Languages.map(lang => lang.id).includes(value);
        },
      },
      required: {
        type: Boolean,
        default: false,
      },
      excludeLanguages: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    computed: {
      language: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      languages() {
        return Languages.filter(l => !this.excludeLanguages.includes(l.id)).sort((langA, langB) =>
          langA.native_name.localeCompare(langB.native_name)
        );
      },
      rules() {
        return this.required ? [v => Boolean(v) || this.$tr('languageRequired')] : [];
      },
    },
    methods: {
      languageText(item) {
        return this.$tr('languageItemText', { language: item.native_name, code: item.id });
      },
    },
    $trs: {
      labelText: 'Language',
      languageItemText: '{language} ({code})',
      languageRequired: 'Language is required',
      noDataText: 'No languages found',
    },
  };

</script>


<style lang="less" scoped>

  .language-dropdown {
    display: inline-block;
    width: 100%;
  }

</style>
