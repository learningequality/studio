<template>

  <DropdownWrapper>
    <template #default="{ attach, menuProps }">
      <VAutocomplete
        v-model="language"
        class="language-dropdown"
        box
        v-bind="$attrs"
        :items="languages"
        :label="$tr('labelText')"
        color="primary"
        itemValue="id"
        :itemText="languageText"
        autoSelectFirst
        :allowOverflow="false"
        clearable
        :rules="rules"
        :required="required"
        :no-data-text="$tr('noDataText')"
        :search-input.sync="input"
        :menu-props="{ ...menuProps, maxWidth: 300 }"
        :multiple="multiple"
        :chips="multiple"
        :attach="attach"
        @change="input = ''"
        @focus="$emit('focus')"
      >
        <template #item="{ item }">
          <VTooltip
            bottom
            lazy
          >
            <template #activator="{ on }">
              <span
                class="text-truncate"
                dir="auto"
                v-on="on"
              >{{ languageText(item) }}</span>
            </template>
            <span>{{ languageText(item) }}</span>
          </VTooltip>
        </template>
      </VAutocomplete>
    </template>
  </DropdownWrapper>

</template>


<script>

  import isArray from 'lodash/isArray';
  import Languages, { LanguagesList } from 'shared/leUtils/Languages';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'LanguageDropdown',
    components: { DropdownWrapper },
    // $attrs are rebound to a descendent component
    inheritAttrs: false,
    props: {
      value: {
        type: [String, Array, Object],
        required: false,
        validator: function (value) {
          if (typeof value === 'string') {
            return !value || Languages.has(value);
          } else if (isArray(value)) {
            return value.every(l => Languages.has(l));
          }
          return !value.toString();
        },
        default: null,
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
      multiple: {
        type: Boolean,
        default: false,
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
        set(val) {
          const value = val || null; // Ensure null is returned if no value is selected
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
        const firstNativeName = item.native_name.split(',')[0].trim();
        return this.$tr('languageItemText', { language: firstNativeName, code: item.id });
      },
    },
    $trs: {
      labelText: 'Language',
      languageItemText: '{language} ({code})',
      languageRequired: 'Field is required',
      noDataText: 'Language not found',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .v-select__selections {
    width: calc(100% - 48px);
    min-height: 0 !important;
  }

  .v-chip,
  ::v-deep .v-chip__content,
  .text-truncate {
    max-width: 100%;
  }

</style>
