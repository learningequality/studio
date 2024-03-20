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
  import { nonUniqueValue } from 'shared/constants';
  import { findLicense } from 'shared/utils/helpers';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { constantsTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

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
    },
    methods: {
      ...mapMutations({
        setShowAboutLicenses: 'SET_SHOW_ABOUT_LICENSES',
      }),
      translate(item) {
        if (item.id === MIXED_VALUE) {
          return this.$tr('mixed');
        }
        return (item.id && item.id !== '' && this.translateConstant(item.license_name)) || '';
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
      right: 12px;
    }

    /deep/ .v-input__control > .v-input__slot {
      background: #e9e9e9 !important;

      &::before {
        border-color: rgba(0, 0, 0, 0.12) !important;
      }
    }

    /deep/ .v-icon {
      position: unset !important;
      margin: unset !important;
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
