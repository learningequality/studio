<template>

  <KMultiSelect
    v-model="language"
    class="language-dropdown"
    :options="languages"
    :label="$tr('labelText')"
    itemValue="id"
    itemText="text"
    :searchKeys="['native_name', 'readable_name', 'id']"
    :multiple="multiple"
    clearable
    :noResultsText="$tr('noDataText')"
    :invalid="invalid"
    :invalidText="invalidText"
    :messages="messages"
    :appearanceOverrides="appearanceOverrides"
    @focus="$emit('focus')"
  />

</template>


<script>

  import KMultiSelect from 'kolibri-design-system/lib/candidate/multiselect/KMultiSelect';
  import isArray from 'lodash/isArray';
  import Languages, { LanguagesList } from 'shared/leUtils/Languages';
  import { commonStrings } from 'shared/strings/commonStrings';

  export default {
    name: 'LanguageDropdown',
    components: { KMultiSelect },
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
        invalidText: '',
      };
    },
    computed: {
      language: {
        get() {
          return this.value;
        },
        set(val) {
          const value = val || (this.multiple ? [] : null);
          this.$emit('input', value);
          if (this.invalidText) {
            this.invalidText = this.getRequiredError(value);
          }
        },
      },
      languages() {
        const excludeLanguages = new Set(this.excludeLanguages);
        return LanguagesList.filter(l => !excludeLanguages.has(l.id)).map(language => ({
          ...language,
          text: this.languageText(language),
        }));
      },
      invalid() {
        return Boolean(this.invalidText);
      },
      appearanceOverrides() {
        return { width: '100%' };
      },
      messages() {
        const {
          openMenuAction$,
          closeMenuAction$,
          clearAction$,
          optionsClickableLabel$,
          allOptionsSelectedLabel$,
          allOptionsDeselectedLabel$,
          optionDeselectedLabel$,
          optionSelectedLabel$,
          optionRemovedLabel$,
        } = commonStrings;
        return {
          clearText: clearAction$,
          open: openMenuAction$,
          close: closeMenuAction$,
          clickable: optionsClickableLabel$,
          allOptionsSelected: allOptionsSelectedLabel$,
          allOptionsDeselected: allOptionsDeselectedLabel$,
          optionDeselected: optionDeselectedLabel$,
          itemsSelected: ({ count }) => this.$tr('itemsSelected', { count }),
          selected: optionSelectedLabel$,
          removed: optionRemovedLabel$,
          cleared: ({ count }) => this.$tr('selectionsCleared', { count }),
        };
      },
    },
    methods: {
      languageText(item) {
        const firstNativeName = item.native_name.split(',')[0].trim();
        return this.$tr('languageItemText', { language: firstNativeName, code: item.id });
      },
      getRequiredError(value) {
        if (!this.required) {
          return '';
        }
        const hasValue = this.multiple ? Boolean(value && value.length) : Boolean(value);
        return hasValue ? '' : this.$tr('languageRequired');
      },
      /**
       * @public
       */
      validate() {
        this.invalidText = this.getRequiredError(this.value);
        return this.invalidText;
      },
    },
    $trs: {
      labelText: 'Language',
      languageItemText: '{language} ({code})',
      languageRequired: 'Field is required',
      noDataText: 'Language not found',
      itemsSelected: '{count, plural, one {# language selected} other {# languages selected}}',
      selectionsCleared: '{count, plural, one {Cleared # selection} other {Cleared # selections}}',
    },
  };

</script>
