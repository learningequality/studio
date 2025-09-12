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

  import countries from '../../utils/countries';

  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

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
      fullWidth: {
        type: Boolean,
        default: false,
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
          setTimeout(this.searchInputClear, 1);
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
      autocompleteMaxWidth() {
        return this.fullWidth ? '100%' : '500px';
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
    max-width: v-bind('autocompleteMaxWidth');
  }

</style>
