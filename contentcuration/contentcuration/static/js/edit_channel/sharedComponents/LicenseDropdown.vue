<template>
  <div>
    <VLayout class="license-dropdown" row alignCenter>
      <VSelect
        ref="license"
        :value="selectedID"
        :items="licenses"
        :label="$tr('licenseLabel')"
        color="primary"
        itemValue="id"
        :itemText="translate"
        :disabled="disabled"
        :required="required"
        :rules="required? rules.license : []"
        :placeholder="placeholder"
        class="license-select"
        @input="handleLicenseChange"
      />
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
    </VLayout>
    <VTextarea
      v-if="isCustom"
      ref="description"
      :value="licenseDescription"
      maxlength="400"
      counter="400"
      noResize
      :label="$tr('licenseDescriptionLabel')"
      :disabled="disabled"
      :placeholder="descriptionPlaceholder"
      :required="descriptionRequired"
      :rules="descriptionRequired? rules.description : []"
      @input="handleDescriptionChange"
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
      required: {
        type: Boolean,
        default: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      selectedID: {
        type: Number,
        required: false,
      },
      placeholder: {
        type: String,
        default: '',
      },
      licenseDescription: {
        type: String,
        required: false,
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
    data() {
      return {
        rules: {
          license: [v => !!v || this.$tr('licenseValidationMessage')],
          description: [v => !!v || this.$tr('descriptionValidationMessage')],
        },
      };
    },
    computed: {
      selectedLicense() {
        return _.findWhere(Constants.Licenses, { id: this.selectedID });
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
        return isCC ? licenseUrl + 'deed.' + window.languageCode : licenseUrl;
      },
    },
    methods: {
      translate(item) {
        return translate(item.license_name);
      },
      handleLicenseChange(licenseID) {
        this.$emit('licensechanged', licenseID);
      },
      handleDescriptionChange(description) {
        this.$emit('descriptionchanged', description);
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .license-dropdown {
    margin: 0;
  }

  /deep/ a {
    .linked-list-item;
  }

</style>
