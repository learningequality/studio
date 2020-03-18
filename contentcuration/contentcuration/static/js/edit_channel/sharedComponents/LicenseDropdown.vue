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
        class="ma-0"
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
      :required="!readonly"
      :rules="descriptionRules"
    />
  </div>

</template>

<script>

  import InfoModal from './InfoModal.vue';
  import Licenses, { LicensesList } from 'shared/leUtils/Licenses';
  import { translate } from 'edit_channel/utils/string_helper';

  export default {
    name: 'LicenseDropdown',
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
          return !value || !value.license || Licenses.has(value.license);
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
    },
    computed: {
      license: {
        get() {
          return this.value && this.value.license;
        },
        set(value) {
          this.$emit('input', {
            license: value,
            license_description: this.isCustom ? this.description : '',
          });
        },
      },
      description: {
        get() {
          return this.value && this.value.license_description;
        },
        set(value) {
          this.$emit('input', {
            license: this.value && this.value.license,
            license_description: this.isCustom ? value : '',
          });
        },
      },
      selectedLicense() {
        return this.value && Licenses.get(this.value.license);
      },
      isCustom() {
        return this.selectedLicense && this.selectedLicense.is_custom;
      },
      licenses() {
        return LicensesList;
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
        return this.isCustom && !this.readonly
          ? [v => !!v || this.$tr('descriptionValidationMessage')]
          : [];
      },
    },
    methods: {
      translate(item) {
        return translate(item.license_name);
      },
    },
    $trs: {
      licenseLabel: 'License',
      licenseValidationMessage: 'License is required',
      licenseDescriptionLabel: 'Description of License',
      descriptionValidationMessage: 'Special permissions license must have a description',
      learnMoreButton: 'Learn More',
    },
  };

</script>
