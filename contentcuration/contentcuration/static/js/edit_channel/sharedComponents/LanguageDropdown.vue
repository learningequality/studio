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
    :menu-props="menuProps"
    @change="input=''"
  >
    <template #item="{item}">
      <VTooltip bottom>
        <template v-slot:activator="{ on }">
          <span class="text-truncate" v-on="on">{{ languageText(item) }}</span>
        </template>
        <span>{{ languageText(item) }}</span>
      </VTooltip>

    </template>
  </VAutocomplete>

</template>


<script>

  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'LanguageDropdown',
    props: {
      value: {
        type: [String, Array],
        required: false,
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
      menuProps() {
        return {
          minWidth: 300,
          maxWidth: 300,
        };
      },
      languages() {
        return Constants.Languages.filter(
          l => !this.excludeLanguages.includes(l.id)
        ).sort((langA, langB) => langA.native_name.localeCompare(langB.native_name));
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
