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
    :search-input.sync="input"
    @change="input=''"
  />

</template>


<script>

  import Languages, { LanguagesList } from 'shared/leUtils/Languages';

  export default {
    name: 'LanguageDropdown',
    props: {
      value: {
        type: [String, Array],
        required: false,
        validator: function(value) {
          return !value || Languages[value];
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
    data() {
      return {
        input: '',
      };
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
        const excludeLanguages = new Set(this.excludeLanguages);
        return LanguagesList.filter(l => !excludeLanguages.has(l.id));
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
