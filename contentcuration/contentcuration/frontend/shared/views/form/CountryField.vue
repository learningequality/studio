<template>

  <DropdownWrapper>
    <template #default="{ attach, menuProps }">
      <VAutocomplete
        v-model="locations"
        :items="options"
        :label="label || $tr('locationLabel')"
        :multiple="multiple"
        :box="box"
        item-value="id"
        item-text="name"
        :required="required"
        :rules="rules"
        :search-input.sync="searchInput"
        :no-data-text="$tr('noCountriesFound')"
        :chips="multiple"
        :attach="attach"
        :menuProps="menuProps"
        clearable
        v-bind="$attrs"
      />
    </template>
  </DropdownWrapper>

</template>


<script>

  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  // NOTE that this list MUST stay in sync with the list of countries
  // generated on the backend in contentcuration/management/commands/loadconstants.py,
  // and special care should be taken when updating the i18n-iso-countries library.
  var countries = require('i18n-iso-countries');
  countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
  countries.registerLocale(require('i18n-iso-countries/langs/es.json'));
  countries.registerLocale(require('i18n-iso-countries/langs/ar.json'));
  countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));
  countries.registerLocale(require('i18n-iso-countries/langs/pt.json'));

  export default {
    name: 'CountryField',
    components: { DropdownWrapper },
    // $attrs are rebound to a descendent component
    inheritAttrs: false,
    props: {
      value: {
        type: [String, Array],
        default() {
          return [];
        },
      },
      required: {
        type: Boolean,
        default: false,
      },
      box: {
        type: Boolean,
        default: true,
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
    },
    data() {
      return {
        searchInput: '',
      };
    },
    computed: {
      locations: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);

          // If selecting multiple countries, a chip is created for the selected item,
          // so the input can be cleared. If selecting a single country, the search input
          // becomes the selected country and should not be cleared to stay visible.
          if (this.multiple) {
            setTimeout(this.searchInputClear, 1);
          }
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
      rules() {
        return [v => (!this.required || v.length ? true : this.$tr('locationRequiredMessage'))];
      },
    },
    methods: {
      searchInputClear() {
        this.searchInput = '';
      },
    },
    $trs: {
      locationLabel: 'Select all that apply',
      locationRequiredMessage: 'Field is required',
      noCountriesFound: 'No countries found',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .v-select__selections {
    width: calc(100% - 48px); // Account for clear icon
    min-height: 0 !important;
  }

  .v-autocomplete {
    max-width: 500px;
  }

</style>
