<template>
  <VAutocomplete
    :value="language"
    :items="languages"
    :label="$tr('labelText')"
    color="primary"
    class="language-dropdown"
    itemValue="id"
    :itemText="languageText"
    autoSelectFirst
    :allowOverflow="false"
    :hint="hint"
    persistentHint
    :placeholder="placeholder"
    @input="selectedLanguage"
  />
</template>


<script>

  import _ from 'underscore';
  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'LanguageDropdown',
    $trs: {
      labelText: 'Language',
      languageItemText: '{language} ({code})',
    },
    props: {
      language: {
        type: String,
        required: false,
        validator: function(value) {
          return !value || _.contains(_.pluck(Constants.Languages, 'id'), value);
        },
      },
      hint: {
        type: String,
        required: false,
      },
      placeholder: {
        type: String,
        default: '',
      },
    },
    computed: {
      languages() {
        return _.chain(Constants.Languages)
          .sortBy('native_name')
          .value();
      },
    },
    methods: {
      selectedLanguage(languageCode) {
        this.$emit('changed', languageCode);
      },
      languageText(item) {
        return this.$tr('languageItemText', { language: item.native_name, code: item.id });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .v-autocomplete {
    display: inline-block;
    width: 150px;
  }

  /deep/ .v-list__tile {
    width: 100%;
    .linked-list-item;
    &:hover,
    &.v-list__tile--highlighted {
      background-color: @gray-200 !important;
    }
  }

</style>
