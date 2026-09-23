<template>

  <KMultiSelect
    ref="multiselect"
    v-model="language"
    class="language-dropdown"
    :options="languages"
    :label="$tr('labelText')"
    itemValue="id"
    itemText="text"
    :searchKeys="['native_name', 'readable_name', 'id']"
    :multiple="multiple"
    :placeholder="placeholder"
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
  import { createMultiSelectMessages } from 'shared/utils/multiSelectMessages';

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
      placeholder: {
        type: String,
        default: '',
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
          clearAction$,
          optionRemovedLabel$,
          languageItemsSelectedLabel$,
          languageSelectionsClearedLabel$,
        } = commonStrings;
        return createMultiSelectMessages({
          clearText: clearAction$,
          itemsSelected: languageItemsSelectedLabel$,
          cleared: ({ label, count }) =>
            this.multiple
              ? languageSelectionsClearedLabel$({ count })
              : optionRemovedLabel$({ label }),
        });
      },
    },
    mounted() {
      this.updateAriaRequired();
    },
    updated() {
      this.updateAriaRequired();
    },
    methods: {
      updateAriaRequired() {
        const multiselectEl = this.$refs.multiselect && this.$refs.multiselect.$el;
        const input = multiselectEl && multiselectEl.querySelector('.kmselect-native-input');
        if (!input) {
          return;
        }
        if (this.required) {
          input.setAttribute('aria-required', 'true');
        } else {
          input.removeAttribute('aria-required');
        }
      },
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
    },
  };

</script>
