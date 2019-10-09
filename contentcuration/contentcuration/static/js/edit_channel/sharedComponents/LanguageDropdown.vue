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
  />
</template>


<script>

  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'LanguageDropdown',
    $trs: {
      labelText: 'Language',
      languageItemText: '{language} ({code})',
      languageRequired: 'Language is required',
    },
    props: {
      value: {
        type: String,
        required: false,
        validator: function(value) {
          return !value || Constants.Languages.map(lang => lang.id).includes(value);
        },
      },
      required: {
        type: Boolean,
        default: false,
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
        return Constants.Languages.sort((langA, langB) =>
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
  };

</script>


<style lang="less" scoped>

  .language-dropdown {
    display: inline-block;
    width: 100%;
  }

</style>
