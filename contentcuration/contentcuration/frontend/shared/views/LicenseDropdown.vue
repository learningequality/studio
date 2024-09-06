<template>

  <div>
    <DropdownWrapper component="VLayout" class="license-dropdown" row align-center>
      <template #default="{ attach, menuProps }">
        <VSelect
          ref="license"
          v-model="license"
          box
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
          :hide-selected="isMixedLicense"
          :menu-props="{ ...menuProps, maxHeight: 250 }"
          class="ma-0"
          :class="{ 'with-trailing-input-icon': box }"
          :attach="attach"
          @focus="$emit('focus')"
        />
      </template>
    </DropdownWrapper>
    <p>
      <KButton
        class="info-link"
        appearance="basic-link"
        :text="reqeuestFormStrings.$tr('licenseInfoHeader')"
        :iconAfter="showAboutLicense ? 'chevronUp' : 'chevronDown'"
        @click="toggleAboutLicenseDisplay"
      />
    </p>
    <div 
      v-for="(licenseItem, index) in licences" 
      v-show="showAboutLicense" 
      :key="index" 
      class="mb-4 mt-3"
    >
      <h2 class="font-weight-bold mb-1 subheading">
        {{ licenseItem.name }}
      </h2>
      <p class="body-1 grey--text mb-1">
        {{ licenseItem.description }}
      </p>
      <p v-if="licenseItem.license_url">
        <ActionLink
          :href="getLicenseUrl(licenseItem)"
          target="_blank"
          :text="reqeuestFormStrings.$tr('learnMoreButton')"
        />
      </p>
    </div>
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

  import RequestForm from '../../settings/pages/Storage/RequestForm.vue';
  import {
    getLicenseValidators,
    getLicenseDescriptionValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { nonUniqueValue } from 'shared/constants';
  import { findLicense } from 'shared/utils/helpers';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { constantsTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';
  import { crossComponentTranslator } from 'shared/i18n';

  const MIXED_VALUE = 'mixed';

  export default {
    name: 'LicenseDropdown',
    components: {
      DropdownWrapper,
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
      box: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        reqeuestFormStrings: crossComponentTranslator(RequestForm),
        showAboutLicense: false,
      };
    },
    computed: {
      license: {
        get() {
          if (this.isMixedLicense) {
            return MIXED_VALUE;
          }
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
          if (this.isMixedDescription) {
            return this.$tr('mixed');
          }
          return this.value && this.value.license_description;
        },
        set(value) {
          this.$emit('input', {
            license: this.value && this.value.license,
            license_description: this.isCustom ? value : '',
          });
        },
      },
      isMixedLicense() {
        return this.value && this.value.license === nonUniqueValue;
      },
      isMixedDescription() {
        return this.value && this.value.license_description === nonUniqueValue;
      },
      selectedLicense() {
        if (this.isMixedLicense) {
          return null;
        }
        return this.value && findLicense(this.value.license);
      },
      isCustom() {
        return this.selectedLicense && this.selectedLicense.is_custom;
      },
      licenses() {
        if (!this.isMixedLicense) {
          return LicensesList;
        }
        return [
          ...LicensesList,
          {
            id: MIXED_VALUE,
            license_name: this.$tr('mixed'),
          },
        ];
      },
      licenseRules() {
        return this.required ? getLicenseValidators().map(translateValidator) : [];
      },
      descriptionRules() {
        return this.isCustom && !this.readonly
          ? getLicenseDescriptionValidators().map(translateValidator)
          : [];
      },
      licences() {
        return LicensesList.filter(license => license.id).map(license => ({
          ...license,
          name: this.translateConstant(license.license_name),
          description: this.translateConstant(license.license_name + '_description'),
        }));
      },
    },
    methods: {
      translate(item) {
        if (item.id === MIXED_VALUE) {
          return this.$tr('mixed');
        }
        return (item.id && item.id !== '' && this.translateConstant(item.license_name)) || '';
      },
      toggleAboutLicenseDisplay() {
        this.showAboutLicense = !this.showAboutLicense;
      },
      getLicenseUrl(license) {
        const isCC = license.license_url.includes('creativecommons.org');
        const language = window.languageCode || 'en';
        return isCC ? `${license.license_url}deed.${language}` : license.license_url;
      },
    },
    $trs: {
      mixed: 'Mixed',
      licenseLabel: 'License',
      licenseDescriptionLabel: 'License description',
    },
  };

</script>

<style lang="scss" scoped>

  .with-trailing-input-icon {
    /deep/ .v-input__append-inner {
      margin-right: 32px;
    }

    /deep/ .v-input__append-outer {
      position: absolute;
      right: 4px;
      margin-top: 8px !important;
    }

    /deep/ .v-input__control > .v-input__slot {
      background: #e9e9e9 !important;

      &::before {
        border-color: rgba(0, 0, 0, 0.12) !important;
      }
    }

    &.v-input--has-state {
      /deep/ .v-input__control > .v-input__slot::before {
        border-color: currentcolor !important;
      }
    }

    &:hover {
      /deep/ .v-input__control > .v-input__slot::before {
        border-color: rgba(0, 0, 0, 0.3) !important;
      }
    }
  }

</style>
