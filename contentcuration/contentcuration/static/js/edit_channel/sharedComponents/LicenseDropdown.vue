<template>
  <div>
    <VLayout class="license-dropdown" row align-center>
      <VSelect
        ref="license"
        v-model="license"
        :items="licenses"
        :label="$tr('licenseLabel')"
        color="primary"
        itemValue="id"
        :itemText="translate"
        :disabled="disabled"
        :required="required"
        :readonly="readonly"
        :rules="licenseRules"
        :placeholder="placeholder"
        class="license-select"
      >
        <template v-slot:append-outer>
          <InfoModal v-if="selectedLicense" :header="translate(selectedLicense)">
            <template v-slot:content>
              <p class="license-info">
                {{ selectedLicense | translateDescription }}
              </p>
            </template>
            <template v-if="selectedLicense.license_url" v-slot:extra-button>
              <VBtn
                flat
                color="primary"
                :href="licenseUrl"
                target="_blank"
                class="action-text"
              >
                {{ $tr('learnMoreButton') }}
              </VBtn>
            </template>
          </InfoModal>
        </template>
      </VSelect>
    </VLayout>
    <VTextarea
      v-if="isCustom"
      ref="description"
      v-model="description"
      class="license-description"
      maxlength="400"
      :counter="!readonly && 400"
      autoGrow
      :label="$tr('licenseDescriptionLabel')"
      :disabled="disabled"
      :placeholder="descriptionPlaceholder"
      :readonly="readonly"
      :required="descriptionRequired"
      :rules="descriptionRules"
    />
  </div>
</template>

<script>

  import _ from 'underscore';
  import InfoModal from './InfoModal.vue';
  import Constants from 'edit_channel/constants';
  import { translate } from 'edit_channel/utils/string_helper';

  export default {
    name: 'LicenseDropdown',
    $trs: {
      licenseLabel: 'License',
      licenseValidationMessage: 'License is required',
      licenseDescriptionLabel: 'Description of License',
      descriptionValidationMessage: 'Special permissions license must have a description',
      learnMoreButton: 'Learn More',
    },
    components: {
      InfoModal,
    },
    filters: {
      translateDescription(item) {
        return translate(item.license_name + '_description');
      },
    },
    props: {
      value: {
        type: Object,
        required: false,
        validator: value => {
          return (
            !value || !value.license || _.pluck(Constants.Licenses, 'id').includes(value.license)
          );
        },
      },
      required: {
        type: Boolean,
        default: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      placeholder: {
        type: String,
        default: '',
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      descriptionPlaceholder: {
        type: String,
        default: '',
      },
      descriptionRequired: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      license: {
        get() {
          return this.value && this.value.license;
        },
        set(value) {
          this.$emit('input', {
            license: value,
            description: this.value && this.value.description,
          });
        },
      },
      description: {
        get() {
          return this.value && this.value.description;
        },
        set(value) {
          this.$emit('input', { license: this.value && this.value.license, description: value });
        },
      },
      selectedLicense() {
        return this.value && _.findWhere(Constants.Licenses, { id: this.value.license });
      },
      isCustom() {
        return this.selectedLicense && this.selectedLicense.is_custom;
      },
      licenses() {
        return _.sortBy(Constants.Licenses, 'id');
      },
      licenseUrl() {
        let licenseUrl = this.selectedLicense.license_url;
        let isCC = licenseUrl.includes('creativecommons.org');
        return isCC ? licenseUrl + 'deed.' + (window.languageCode || 'en') : licenseUrl;
      },
      licenseRules() {
        return this.required ? [v => !!v || this.$tr('licenseValidationMessage')] : [];
      },
      descriptionRules() {
        return this.descriptionRequired
          ? [v => !!v || this.$tr('descriptionValidationMessage')]
          : [];
      },
    },
    methods: {
      translate(item) {
        return translate(item.license_name);
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .license-select {
    margin: 0;
  }

  /deep/ a {
    .linked-list-item;
  }

</style>
