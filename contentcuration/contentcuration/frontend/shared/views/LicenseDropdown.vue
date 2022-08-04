<template>

  <div class="license-container">
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
        :menu-props="{offsetY: true, lazy: true, top: true, zIndex: 4}"
        class="ma-0"
        box
        :attach="$attrs.id ? `#${$attrs.id}` : '.license-container'"
        @focus="$emit('focus')"
      >
        <template #append-outer>
          <InfoModal :header="$tr('licenseInfoHeader')" :items="licenses">
            <template #header="{ item }">
              {{ translate(item) }}
            </template>
            <template #description="{ item }">
              {{ translateDescription(item) }}
              <p v-if="item.license_url" class="mt-1">
                <ActionLink
                  :href="getLicenseUrl(item)"
                  target="_blank"
                  :text="$tr('learnMoreButton')"
                />
              </p>
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
      box
      @focus="$emit('descriptionFocus')"
    />
  </div>

</template>

<script>

  import InfoModal from './InfoModal.vue';
  import {
    getLicenseValidators,
    getLicenseDescriptionValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { findLicense } from 'shared/utils/helpers';

  export default {
    name: 'LicenseDropdown',
    components: {
      InfoModal,
    },
    filters: {},
    mixins: [constantsTranslationMixin],
    props: {
      value: {
        type: Object,
        required: false,
        validator: value => {
          return value && (!value.license || findLicense(value.license, { id: null }).id !== null);
        },
        default: null,
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
          return this.value && findLicense(this.value.license).id;
        },
        set(value) {
          this.$emit('input', {
            license: findLicense(value).id,
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
        return this.value && findLicense(this.value.license);
      },
      isCustom() {
        return this.selectedLicense && this.selectedLicense.is_custom;
      },
      licenses() {
        return LicensesList;
      },
      licenseRules() {
        return this.required ? getLicenseValidators().map(translateValidator) : [];
      },
      descriptionRules() {
        return this.isCustom && !this.readonly
          ? getLicenseDescriptionValidators().map(translateValidator)
          : [];
      },
    },
    methods: {
      translate(item) {
        return (item.id && item.id !== '' && this.translateConstant(item.license_name)) || '';
      },
      translateDescription(item) {
        return (
          (item.id &&
            item.id !== '' &&
            this.translateConstant(item.license_name + '_description')) ||
          ''
        );
      },
      getLicenseUrl(item) {
        const isCC = item.license_url.includes('creativecommons.org');
        const language = window.languageCode || 'en';
        return isCC ? `${item.license_url}deed.${language}` : item.license_url;
      },
    },
    $trs: {
      licenseLabel: 'License',
      licenseDescriptionLabel: 'License description',
      learnMoreButton: 'Learn More',
      licenseInfoHeader: 'About licenses',
    },
  };

</script>

<style lang="less" scoped>
  .license-container {
    position: relative;
  }
</style>
