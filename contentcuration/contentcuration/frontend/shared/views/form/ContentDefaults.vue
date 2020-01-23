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
        :label="$tr('author')"
        :placeholder="$tr('authorPlaceholder')"
        @change="emitChange"
      />
      <VTextField
        v-model="provider"
        outline
        :label="$tr('provider')"
        :placeholder="$tr('providerPlaceholder')"
        @change="emitChange"
      />
      <VTextField
        v-model="aggregator"
        outline
        :label="$tr('aggregator')"
        :placeholder="$tr('aggregatorPlaceholder')"
        @change="emitChange"
      />
      <VTextField
        v-model="copyrightHolder"
        outline
        :label="$tr('copyrightHolder')"
        :placeholder="$tr('copyrightHolderPlaceholder')"
        @change="emitChange"
      />
      <VSelect
        v-model="license"
        outline
        :items="licenseOpts"
        :label="$tr('license')"
        @change="emitChange"
      />
      <VTextarea
        v-if="isCustomLicense"
        v-model="licenseDescription"
        outline
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
        :label="$tr('videos')"
        @change="emitChange"
      />
      <Checkbox
        v-model="autoDeriveAudioThumbnail"
        class="mt-2"
        :label="constantStrings('audio')"
        @change="emitChange"
      />
      <Checkbox
        v-model="autoDeriveHtml5Thumbnail"
        class="mt-2"
        :label="$tr('html5')"
        @change="emitChange"
      />
      <Checkbox
        v-model="autoDeriveDocumentThumbnail"
        class="mt-2"
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
  import { ContentDefaults } from 'shared/constants';

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
      return {
        author: this.contentDefaults.author || '',
        provider: this.contentDefaults.provider || '',
        aggregator: this.contentDefaults.aggregator || '',
        copyrightHolder: this.contentDefaults.copyright_holder || '',
        license: parseInt(this.contentDefaults.license, 10) || '',
        licenseDescription: this.contentDefaults.license_description || '',

        autoDeriveAudioThumbnail: defaultTo(this.contentDefaults.auto_derive_audio_thumbnail, true),
        autoDeriveDocumentThumbnail: defaultTo(
          this.contentDefaults.auto_derive_document_thumbnail,
          true
        ),
        autoDeriveHtml5Thumbnail: defaultTo(this.contentDefaults.auto_derive_html5_thumbnail, true),
        autoDeriveVideoThumbnail: defaultTo(this.contentDefaults.auto_derive_video_thumbnail, true),
      };
    },
    computed: {
      licenseOpts() {
        const licenseOpts = Constants.Licenses.map(license => ({
          value: license.id,
          text: this.translateConstant(license.license_name),
        }));

        licenseOpts.unshift({
          value: '',
          text: this.$tr('noLicense'),
        });
        return licenseOpts;
      },
      isCustomLicense() {
        const licenseId = parseInt(this.license, 10) || 0;
        const license = Constants.Licenses.find(license => license.id === licenseId);
        return license && license.is_custom;
      },
    },
    methods: {
      emitChange() {
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
