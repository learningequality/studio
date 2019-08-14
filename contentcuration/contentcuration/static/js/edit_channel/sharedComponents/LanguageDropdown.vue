<template>
  <VAutocomplete
    v-model="language"
    :items="languages"
    :label="$tr('labelText')"
    color="primary"
    itemValue="id"
    :itemText="languageText"
    autoSelectFirst
    :allowOverflow="false"
    :hint="hint"
    persistentHint
    :placeholder="placeholder"
    :readonly="readonly"
    :required="required"
    :rules="required? rules : []"
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
      languageRequired: 'Language is required',
    },
    props: {
      value: {
        type: String,
        required: false,
        validator: function(value) {
          return !value || _.pluck(Constants.Languages, 'id').includes(value);
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
      readonly: {
        type: Boolean,
        default: false,
      },
      required: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        rules: [v => !!v || this.$tr('languageRequired')],
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
        return _.chain(Constants.Languages)
          .sortBy('native_name')
          .value();
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

  @import '../../../less/global-variables.less';

  .v-autocomplete {
    display: inline-block;
    width: 100%;
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
