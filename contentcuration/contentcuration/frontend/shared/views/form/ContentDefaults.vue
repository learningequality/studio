<template>

  <div>
    <fieldset class="py-1 mt-3">
      <legend class="py-1 title font-weight-bold">
        {{ defaultsTitle || $tr('defaultsTitle') }}
      </legend>
      <p class="subtitle-1">
        {{ defaultsSubTitle || $tr('defaultsSubTitle') }}
      </p>

      <VTextField
        v-model="author"
        outline
        data-name="author"
        :label="$tr('author')"
        :placeholder="$tr('authorPlaceholder')"
        @change="emitChange"
      />
      <VTextField
        v-model="provider"
        outline
        data-name="provider"
        :label="$tr('provider')"
        :placeholder="$tr('providerPlaceholder')"
        @change="emitChange"
      />
      <VTextField
        v-model="aggregator"
        outline
        data-name="aggregator"
        :label="$tr('aggregator')"
        :placeholder="$tr('aggregatorPlaceholder')"
        @change="emitChange"
      />
      <VTextField
        v-model="copyrightHolder"
        outline
        data-name="copyrightHolder"
        :label="$tr('copyrightHolder')"
        :placeholder="$tr('copyrightHolderPlaceholder')"
        @change="emitChange"
      />
      <VSelect
        v-model="license"
        outline
        data-name="license"
        :items="licenseOpts"
        :label="$tr('license')"
        @change="emitChange"
      />
      <VTextarea
        v-if="isCustomLicense"
        v-model="licenseDescription"
        outline
        data-name="licenseDescription"
        :label="$tr('licenseDescription')"
        :placeholder="$tr('licenseDescriptionPlaceholder')"
        @change="emitChange"
      />
    </fieldset>

    <fieldset class="py-1 mt-3">
      <legend class="py-1 title font-weight-bold">
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
        :label="constantStrings('audio')"
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
  import Constants from 'edit_channel/constants/index';
  import { ContentDefaults, ContentDefaultsDefaults } from 'shared/constants';

  function findLicense(name, defaultValue = {}) {
    return Constants.Licenses.find(license => license.license_name === name) || defaultValue;
  }

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
        const licenseOpts = Constants.Licenses.map(license => ({
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
      defaultsTitle: 'New resource defaults (optional)',
      defaultsSubTitle: 'New resources you create will be automatically given these fields',
      author: 'Author',
      authorPlaceholder: 'Enter author name...',
      aggregator: 'Aggregator',
      aggregatorPlaceholder: 'Enter aggregator name...',
      provider: 'Provider',
      providerPlaceholder: 'Enter provider name...',
      license: 'License',
      licenseDescription: 'License description',
      licenseDescriptionPlaceholder: 'Enter license description...',
      noLicense: 'No license selected',
      copyrightHolder: 'Copyright Holder',
      copyrightHolderPlaceholder: 'Enter copyright holder name...',
      thumbnailsTitle: 'Automatically generate thumbnails for the following:',
      videos: 'Videos',
      html5: 'HTML5 Apps',
      documents: 'Documents',
    },
  };

</script>


<style lang="less" scoped>

  .subtitle-1 {
    font-size: 16px;
  }

</style>
