<template>
  <VAutocomplete
    ref="select"
    v-model="selected"
    :items="languages"
    :label="$tr('labelText')"
    color="#2196f3"
    :value="language"
    itemValue="id"
    itemText="native_name"
    :autoSelectFirst="true"
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
    watch: {
      select() {
        setTimeout(() => {
          this.$refs.select.menuIsActive = false;
        }, 50);
      },
    },
    mounted() {
      this.selected = this.language; // || State.preferences.language
    },
    methods: {
      selectedLanguage(languageCode) {
        this.$emit('changed', languageCode);
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

  .v-menu__content {
    width: 300px;
  }

</style>
