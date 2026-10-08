<template>

  <KMultiSelect
    v-model="locations"
    :options="options"
    :label="label || $tr('locationLabel')"
    :multiple="multiple"
    itemValue="id"
    itemText="name"
    :disabled="disabled"
    :invalid="invalid"
    :invalidText="$tr('locationRequiredMessage')"
    :noResultsText="$tr('noCountriesFound')"
    :appearanceOverrides="{ maxWidth: fullWidth ? '100%' : '500px' }"
    :messages="messages"
    clearable
    @blur="touched = true"
  />

</template>


<script>

  import KMultiSelect from 'kolibri-design-system/lib/candidate/multiselect/KMultiSelect';
  import countries from '../../utils/countries';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { createMultiSelectMessages } from 'shared/utils/multiSelectMessages';

  export default {
    name: 'CountryField',
    components: { KMultiSelect },
    props: {
      value: {
        type: [String, Array],
        default: null,
      },
      required: {
        type: Boolean,
        default: false,
      },
      multiple: {
        type: Boolean,
        default: true,
      },
      label: {
        type: String,
        required: false,
        default: null,
      },
      fullWidth: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        touched: false,
      };
    },
    computed: {
      locations: {
        get() {
          // KMultiSelect expects an array in multiple mode and a string or null in single mode
          if (this.multiple) {
            return this.value || [];
          }
          return this.value || null;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      options() {
        // Map by English names so we have it on the backend
        const code = (window.languageCode || 'en').split('-')[0];
        return Object.entries(countries.getNames('en')).map(country => {
          return {
            id: country[1],
            name: countries.getName(country[0], code),
          };
        });
      },
      invalid() {
        const hasSelection = this.multiple ? this.locations.length > 0 : Boolean(this.locations);
        return this.required && this.touched && !hasSelection;
      },
      messages() {
        const {
          clearAction$,
          optionRemovedLabel$,
          countryItemsSelectedLabel$,
          countrySelectionsClearedLabel$,
        } = commonStrings;
        return createMultiSelectMessages({
          clearText: clearAction$,
          itemsSelected: countryItemsSelectedLabel$,
          // KMultiSelect passes a label in single mode and a count in multiple mode
          cleared: ({ label, count }) =>
            this.multiple
              ? countrySelectionsClearedLabel$({ count })
              : optionRemovedLabel$({ label }),
        });
      },
    },
    $trs: {
      locationLabel: 'Select all that apply',
      locationRequiredMessage: 'Field is required',
      noCountriesFound: 'No countries found',
    },
  };

</script>
