<template>

  <div>
    <fieldset class="content-defaults mt-3 py-1">
      <legend class="font-weight-bold legend-title py-1">
        {{ defaultsTitle || $tr('defaultsTitle') }}
      </legend>
      <p class="subtitle-1">
        {{ defaultsSubTitle || $tr('defaultsSubTitle') }}
      </p>

      <VTextField
        v-model="author"
        box
        maxlength="200"
        counter
        data-name="author"
        :label="$tr('author')"
      />
      <VTextField
        v-model="provider"
        box
        maxlength="200"
        counter
        data-name="provider"
        :label="$tr('provider')"
      />
      <VTextField
        v-model="aggregator"
        box
        maxlength="200"
        counter
        data-name="aggregator"
        :label="$tr('aggregator')"
      />
      <VTextField
        v-model="copyrightHolder"
        box
        maxlength="200"
        counter
        data-name="copyrightHolder"
        :label="$tr('copyrightHolder')"
      />
      <DropdownWrapper>
        <template #default="{ attach, menuProps }">
          <VSelect
            v-model="license"
            box
            data-name="license"
            :items="licenseOpts"
            :label="$tr('license')"
            :attach="attach"
            :menuProps="menuProps"
          />
        </template>
      </DropdownWrapper>
      <VTextarea
        v-if="isCustomLicense"
        v-model="licenseDescription"
        box
        maxlength="400"
        counter
        data-name="licenseDescription"
        :label="$tr('licenseDescription')"
        auto-grow
      />
    </fieldset>

    <fieldset class="content-defaults mt-3 py-1">
      <legend class="font-weight-bold legend-title py-1">
        {{ thumbnailsSubTitle || $tr('thumbnailsTitle') }}
      </legend>

      <Checkbox
        v-model="autoDeriveVideoThumbnail"
        class="mt-2"
        data-name="autoDeriveVideoThumbnail"
        :label="$tr('videos')"
        style="font-size: 16px;"
      />
      <Checkbox
        v-model="autoDeriveAudioThumbnail"
        class="mt-2"
        data-name="autoDeriveAudioThumbnail"
        :label="translateConstant('audio')"
        style="font-size: 16px;"
      />
      <Checkbox
        v-model="autoDeriveHtml5Thumbnail"
        class="mt-2"
        data-name="autoDeriveHtml5Thumbnail"
        :label="$tr('html5')"
        style="font-size: 16px;"
      />
      <Checkbox
        v-model="autoDeriveDocumentThumbnail"
        class="mt-2"
        data-name="autoDeriveDocumentThumbnail"
        :label="$tr('documents')"
        style="font-size: 16px;"
      />
    </fieldset>
  </div>

</template>


<script>

  import defaultTo from 'lodash/defaultTo';
  import { constantsTranslationMixin } from '../../../shared/mixins';
  import Checkbox from './Checkbox';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { ContentDefaults, ContentDefaultsDefaults } from 'shared/constants';
  import { findLicense } from 'shared/utils/helpers';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  function normalizeContentDefaults(contentDefaults) {
    return Object.entries(ContentDefaultsDefaults).reduce((normalized, [key, defaultValue]) => {
      return {
        ...normalized,
        [ContentDefaults[key]]: defaultTo(contentDefaults[key], defaultValue),
      };
    }, {});
  }

  function camelToSnakeCase(contentDefaults) {
    return Object.entries(ContentDefaults).reduce((data, [snakeCaseName, camelCaseName]) => {
      const value = contentDefaults[camelCaseName] === '' ? null : contentDefaults[camelCaseName];
      return Object.assign(data, { [snakeCaseName]: value });
    }, {});
  }

  function generateGetterSetter(key) {
    return {
      get() {
        return this.normalized[key];
      },
      set(value) {
        this.normalized[key] = value;
        this.emitChange();
      },
    };
  }

  export default {
    name: 'ContentDefaults',
    components: {
      DropdownWrapper,
      Checkbox,
    },
    mixins: [constantsTranslationMixin],
    model: {
      prop: 'contentDefaults',
      event: 'change',
    },
    props: {
      contentDefaults: {
        type: Object,
        default() {
          return { ...ContentDefaultsDefaults };
        },
      },
      defaultsTitle: {
        type: String,
        default: null,
      },
      defaultsSubTitle: {
        type: String,
        default: null,
      },
      thumbnailsSubTitle: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        normalized: normalizeContentDefaults(this.contentDefaults),
      };
    },
    computed: {
      author: generateGetterSetter('author'),
      provider: generateGetterSetter('provider'),
      aggregator: generateGetterSetter('aggregator'),
      copyrightHolder: generateGetterSetter('copyrightHolder'),
      licenseDescription: generateGetterSetter('licenseDescription'),
      autoDeriveAudioThumbnail: generateGetterSetter('autoDeriveAudioThumbnail'),
      autoDeriveDocumentThumbnail: generateGetterSetter('autoDeriveDocumentThumbnail'),
      autoDeriveHtml5Thumbnail: generateGetterSetter('autoDeriveHtml5Thumbnail'),
      autoDeriveVideoThumbnail: generateGetterSetter('autoDeriveVideoThumbnail'),
      license: {
        get() {
          return findLicense(this.normalized.license, { license_name: '' }).license_name;
        },
        set(value) {
          this.normalized['license'] = value;
          this.emitChange();
        },
      },
      licenseOpts() {
        const licenseOpts = LicensesList.map(license => ({
          value: license.license_name,
          text: this.translateConstant(license.license_name),
        }));

        licenseOpts.unshift({
          value: '',
          text: this.$tr('noLicense'),
        });
        return licenseOpts;
      },
      isCustomLicense() {
        return findLicense(this.license, { is_custom: false }).is_custom;
      },
    },
    watch: {
      contentDefaults(newValue) {
        this.normalized = normalizeContentDefaults(newValue);
      },
    },
    methods: {
      emitChange() {
        this.$emit('change', camelToSnakeCase(this.normalized));
      },
    },
    $trs: {
      defaultsTitle: 'Default copyright settings for new resources (optional)',
      defaultsSubTitle: 'New resources will be automatically given these values',
      author: 'Author',
      aggregator: 'Aggregator',
      provider: 'Provider',
      license: 'License',
      licenseDescription: 'License description',
      noLicense: 'No license selected',
      copyrightHolder: 'Copyright holder',
      thumbnailsTitle: 'Automatically generate thumbnails for the following resource types',
      videos: 'Videos',
      html5: 'HTML5 apps',
      documents: 'Documents',
    },
  };

</script>


<style lang="scss" scoped>

  .content-defaults {
    border: 0;
  }

  .subtitle-1 {
    font-size: 16px;
  }

  .legend-title {
    font-size: 18px;
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .v-select {
    max-width: 400px;
  }

</style>
