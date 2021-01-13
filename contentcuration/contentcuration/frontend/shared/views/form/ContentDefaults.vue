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
        @change="emitChange"
      />
      <VTextField
        v-model="provider"
        box
        maxlength="200"
        counter
        data-name="provider"
        :label="$tr('provider')"
        @change="emitChange"
      />
      <VTextField
        v-model="aggregator"
        box
        maxlength="200"
        counter
        data-name="aggregator"
        :label="$tr('aggregator')"
        @change="emitChange"
      />
      <VTextField
        v-model="copyrightHolder"
        box
        maxlength="200"
        counter
        data-name="copyrightHolder"
        :label="$tr('copyrightHolder')"
        @change="emitChange"
      />
      <VSelect
        v-model="license"
        box
        data-name="license"
        :items="licenseOpts"
        :label="$tr('license')"
        menuProps="offsetY"
        @change="emitChange"
      />
      <VTextarea
        v-if="isCustomLicense"
        v-model="licenseDescription"
        box
        maxlength="400"
        counter
        data-name="licenseDescription"
        :label="$tr('licenseDescription')"
        auto-grow
        @change="emitChange"
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
        @change="emitChange"
      />
      <Checkbox
        v-model="autoDeriveAudioThumbnail"
        class="mt-2"
        data-name="autoDeriveAudioThumbnail"
        :label="translateConstant('audio')"
        @change="emitChange"
      />
      <Checkbox
        v-model="autoDeriveHtml5Thumbnail"
        class="mt-2"
        data-name="autoDeriveHtml5Thumbnail"
        :label="$tr('html5')"
        @change="emitChange"
      />
      <Checkbox
        v-model="autoDeriveDocumentThumbnail"
        class="mt-2"
        data-name="autoDeriveDocumentThumbnail"
        :label="$tr('documents')"
        @change="emitChange"
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

  function normalizeContentDefaults(contentDefaults) {
    return Object.entries(ContentDefaultsDefaults).reduce((normalized, [key, defaultValue]) => {
      return {
        ...normalized,
        [ContentDefaults[key]]: defaultTo(contentDefaults[key], defaultValue),
      };
    }, {});
  }

  export default {
    name: 'ContentDefaults',
    components: {
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
      },
      defaultsSubTitle: {
        type: String,
      },
      thumbnailsSubTitle: {
        type: String,
      },
    },
    data() {
      const normalized = normalizeContentDefaults(this.contentDefaults);

      return {
        author: normalized.author,
        provider: normalized.provider,
        aggregator: normalized.aggregator,
        copyrightHolder: normalized.copyrightHolder,
        license: findLicense(normalized.license, { license_name: '' }).license_name,
        licenseDescription: normalized.licenseDescription,
        autoDeriveAudioThumbnail: normalized.autoDeriveAudioThumbnail,
        autoDeriveDocumentThumbnail: normalized.autoDeriveDocumentThumbnail,
        autoDeriveHtml5Thumbnail: normalized.autoDeriveHtml5Thumbnail,
        autoDeriveVideoThumbnail: normalized.autoDeriveVideoThumbnail,
      };
    },
    computed: {
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
    methods: {
      emitChange() {
        // When any field in our component changes, this gets triggered which then triggers the
        // event that updates the prop passed into us as `contentDefaults` in the parent component.
        // This assigns the data into a object, with snake cased keys instead of camel cased here
        this.$nextTick(() => {
          this.$emit(
            'change',
            Object.entries(ContentDefaults).reduce((data, [snakeCaseName, camelCaseName]) => {
              const value = this[camelCaseName] === '' ? null : this[camelCaseName];
              return Object.assign(data, { [snakeCaseName]: value });
            }, {})
          );
        });
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


<style lang="less" scoped>

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
