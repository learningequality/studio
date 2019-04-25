<template>
  <VAutocomplete
    v-model="selected"
    :items="languages"
    :label="$tr('labelText')"
    color="#2196f3"
    itemValue="id"
    :itemText="languageText"
    :autoSelectFirst="true"
    :allowOverflow="false"
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
    },
    data() {
      return {
        selected: '',
      };
    },
    computed: {
      languages() {
        return _.chain(Constants.Languages)
          .sortBy('native_name')
          .value();
      },
    },
    mounted() {
      this.selected = this.language;
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
    text-decoration: none !important;
    &:hover,
    &.v-list__tile--highlighted {
      background-color: @gray-200 !important;
    }
  }

</style>
