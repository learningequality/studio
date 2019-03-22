<template>
  <span>
    <span class="language-icon" :title="$tr('languageTitle')">language</span>
    <select ref="languagedropdown" @input="selectedLanguage">
      <option disabled :selected="!selected">{{ $tr('defaultText') }}</option>
      <option v-for="language in languages" :value="language.id" :selected="selected === language.id">{{language.native_name}}</option>
    </select>
  </span>
</template>


<script>

import Constants from 'edit_channel/constants/index';

export default {
  name: 'LanguageDropdown',
  $trs: {
  	defaultText: "Select a language...",
    languageTitle: "Language"
  },
  props: {
    language: {
      type: String,
      required: false,
      validator: function (value) {
        return !value || _.contains(_.pluck(Constants.Languages, 'id'), value);
      }
    }
  },
  data () {
    return {
      selected: ""
    }
  },
  mounted() {
    this.selected = this.language; // || State.preferences.language
  },
  computed: {
    languages() {
      return Constants.Languages;
    }
  },
  methods: {
    selectedLanguage() {
      this.$emit('changed', this.$refs.languagedropdown.value);
    }
  }
}

</script>


<style lang="less" scoped>
@import '../../../less/global-variables.less';

.language-icon {
  .material-icons;
  color: @blue-200;
  vertical-align: top;
  font-size: 18pt;
  padding-right: 5px;
  cursor: default;
}

select {
  max-width: 150px;
}

</style>
