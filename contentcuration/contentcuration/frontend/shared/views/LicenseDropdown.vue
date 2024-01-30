<template>

  <div>
    <DropdownWrapper component="VLayout" class="license-dropdown" row align-center>
      <template #default="{ attach, menuProps }">
        <VSelect
          box
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
          :menu-props="{ ...menuProps, maxHeight: 250 }"
          class="ma-0"
          :class="{ 'with-trailing-input-icon': box }"
          :attach="attach"
          @focus="$emit('focus')"
        >
          <template #append-outer>
            <Icon
              class="info-icon"
              color="primary"
              data-test="info-icon"
              @click="setShowAboutLicenses(true)"
            >
              help
            </Icon>
          </template>
        </VSelect>
      </template>
    </DropdownWrapper>
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

  import { mapMutations } from 'vuex';
  import {
    getLicenseValidators,
    getLicenseDescriptionValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { findLicense } from 'shared/utils/helpers';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

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
      ...mapMutations({
        setShowAboutLicenses: 'SET_SHOW_ABOUT_LICENSES',
      }),
      translate(item) {
        return (item.id && item.id !== '' && this.translateConstant(item.license_name)) || '';
      },
    },
    $trs: {
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
      right: 12px;
    }
    /deep/ .v-input__control > .v-input__slot {
      background: #e9e9e9 !important;
      &::before {
        border-color: rgba(0, 0, 0, 0.12) !important;
      }
    }
    /deep/ .v-icon {
      margin: unset !important;
      position: unset !important;
    }
    &.v-input--has-state {
      /deep/ .v-input__control > .v-input__slot::before {
        border-color: currentColor  !important;
      }
    }
    &:hover {
      /deep/ .v-input__control > .v-input__slot::before {
        border-color: rgba(0, 0, 0, 0.3) !important;
      }
    }
  }
</style>
