<template>

  <div v-if="nodes.length" class="details-edit-view">
    <VForm ref="form" v-model="valid" :disabled="viewOnly" :lazy-validation="newContent">
      <!-- File upload and preview section -->
      <template v-if="oneSelected && allResources && !allExercises">
        <FileUpload
          v-if="oneSelected && allResources && !allExercises"
          :key="firstNode.id"
          :nodeId="firstNode.id"
          :viewOnly="viewOnly"
        />
        <VDivider />
      </template>

      <!-- Basic information + audience -->
      <VLayout row wrap class="section">
        <VFlex v-if="oneSelected" xs12 md6 lg7>
          <h1 class="subheading">
            {{ $tr('basicInfoHeader') }}
          </h1>
          <!-- Title -->
          <VTextField
            ref="title"
            v-model="title"
            :counter="(viewOnly)? null : 200"
            maxlength="200"
            :rules="titleRules"
            :label="$tr('titleLabel')"
            autofocus
            required
            :readonly="viewOnly"
          />
          <!-- Description -->
          <VTextarea
            ref="description"
            v-model="description"
            :label="$tr('descriptionLabel')"
            :counter="!viewOnly && 400"
            autoGrow
            :readonly="viewOnly"
          />
        </VFlex>
        <VSpacer v-if="oneSelected" />
        <VFlex xs12 md5 lg4 xl3>
          <h1 class="subheading">
            {{ $tr('audienceHeader') }}
          </h1>
          <!-- Language -->
          <LanguageDropdown
            ref="language"
            v-model="language"
            class="mb-2"
            :hint="languageHint"
            :placeholder="getPlaceholder('language')"
            :readonly="viewOnly"
            :clearable="!viewOnly"
          />

          <!-- Visibility -->
          <VisibilityDropdown
            v-if="allResources"
            ref="role_visibility"
            v-model="role"
            :placeholder="getPlaceholder('role_visibility')"
            :required="isUnique(role)"
            :readonly="viewOnly"
          />
        </VFlex>
        <VFlex xs12>
          <!-- Tags -->
          <VCombobox
            ref="tags"
            v-model="contentTags"
            class="tagbox"
            :items="tags"
            :searchInput.sync="tagText"
            :readonly="viewOnly"
            chips
            :label="$tr('tagsLabel')"
            multiple
            deletableChips
            hideSelected
            maxlength="30"
            autoSelectFirst
          >
            <template v-slot:no-data>
              <VListTile v-if="tagText && tagText.trim()">
                <VListTileContent>
                  <VListTileTitle>
                    {{ $tr('noTagsFoundText', {text: tagText.trim()}) }}
                  </VListTileTitle>
                </VListTileContent>
              </VListTile>
            </template>
          </VCombobox>
        </VFlex>
      </VLayout>


      <!-- Source + thumbnail -->
      <VLayout row wrap class="section">
        <template v-if="allResources">
          <VFlex xs12>
            <VDivider />
          </VFlex>
          <VFlex xs12 md6 class="auth-section">
            <h1 class="subheading">
              {{ $tr('sourceHeader') }}
            </h1>
            <p v-if="disableAuthEdits" class="grey--text">
              {{ $tr('detectedImportText') }}
            </p>
            <p v-if="oneSelected && isImported">
              <ActionLink
                :href="importUrl"
                target="_blank"
                :text="$tr('importedFromButtonText', {channel: importChannelName})"
              />
            </p>

            <!-- Author -->
            <VCombobox
              ref="author"
              v-model="author"
              :items="authors"
              :label="$tr('authorLabel')"
              :readonly="viewOnly || disableAuthEdits"
              maxlength="200"
              autoSelectFirst
              :placeholder="getPlaceholder('author')"
            >
              <template v-slot:append-outer>
                <HelpTooltip :text="$tr('authorToolTip')" top />
              </template>
            </VCombobox>

            <!-- Provider -->
            <VCombobox
              ref="provider"
              v-model="provider"
              :items="providers"
              :label="$tr('providerLabel')"
              :readonly="viewOnly || disableAuthEdits"
              maxlength="200"
              :placeholder="getPlaceholder('provider')"
              autoSelectFirst
            >
              <template v-slot:append-outer>
                <HelpTooltip :text="$tr('providerToolTip')" top />
              </template>
            </VCombobox>

            <!-- Aggregator -->
            <VCombobox
              ref="aggregator"
              v-model="aggregator"
              :items="aggregators"
              :label="$tr('aggregatorLabel')"
              :readonly="viewOnly || disableAuthEdits"
              maxlength="200"
              autoSelectFirst
              :placeholder="getPlaceholder('aggregator')"
            >
              <template v-slot:append-outer>
                <HelpTooltip :text="$tr('aggregatorToolTip')" top />
              </template>
            </VCombobox>

            <!-- License -->
            <LicenseDropdown
              ref="license"
              v-model="licenseItem"
              :required="isUnique(license) && isUnique(license_description) && !disableAuthEdits"
              :readonly="viewOnly || disableAuthEdits"
              :placeholder="getPlaceholder('license')"
              :descriptionPlaceholder="getPlaceholder('license_description')"
            />

            <!-- Copyright Holder -->
            <VCombobox
              v-if="copyrightHolderRequired"
              ref="copyright_holder"
              v-model="copyright_holder"
              :items="copyrightHolders"
              :label="$tr('copyrightHolderLabel')"
              maxlength="200"
              :required="isUnique(copyright_holder) && !disableAuthEdits"
              :rules="copyrightHolderRules"
              :placeholder="getPlaceholder('copyright_holder')"
              autoSelectFirst
              :readonly="viewOnly || disableAuthEdits"
            />
          </VFlex>
          <VSpacer />
        </template>

        <VFlex v-if="oneSelected" xs12 md5 lg4 xl3>
          <h1 class="subheading">
            {{ $tr('thumbnailHeader') }}
          </h1>
          <!-- Thumbnail -->
          <div style="width:250px;">
            <Thumbnail
              v-model="thumbnail"
              :kind="firstNode.kind"
              :primaryFilePath="primaryFile"
              :encoding="thumbnailEncoding"
              @encoded="setEncoding"
            />
          </div>
        </VFlex>
      </VLayout>

      <!-- Assessment options -->
      <VLayout v-if="allExercises" row wrap class="section">
        <VFlex xs12>
          <VDivider />
        </VFlex>
        <VFlex xs12>
          <h1 class="subheading">
            {{ $tr('assessmentHeader') }}
          </h1>

          <!-- Mastery -->
          <MasteryDropdown
            v-if="extra_fields"
            ref="mastery_model"
            v-model="masteryModelItem"
            :placeholder="getPlaceholder('mastery_model')"
            :required="isUnique(mastery_model)"
            :mPlaceholder="getPlaceholder('m')"
            :mRequired="isUnique(m)"
            :nPlaceholder="getPlaceholder('n')"
            :nRequired="isUnique(n)"
            :readonly="viewOnly"
          />

          <!-- Randomize question order -->
          <VCheckbox
            ref="randomize"
            v-model="randomizeOrder"
            :label="$tr('randomizeQuestionLabel')"
            :indeterminate="!isUnique(randomizeOrder)"
            color="primary"
            hide-details
            :readonly="viewOnly"
          />
        </VFlex>
      </VLayout>

      <!-- Subtitles -->
      <VLayout v-if="videoSelected" row wrap class="section">
        <VFlex xs12>
          <VDivider />
        </VFlex>
        <VFlex xs12 md8 lg7>
          <SubtitlesList :nodeId="firstNode.id" :readonly="viewOnly" />
        </VFlex>
      </VLayout>
    </VForm>
  </div>

</template>

<script>

  import difference from 'lodash/difference';
  import intersection from 'lodash/intersection';
  import uniq from 'lodash/uniq';
  import { mapGetters, mapActions } from 'vuex';
  import Constants from 'edit_channel/constants';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import HelpTooltip from 'edit_channel/sharedComponents/HelpTooltip';
  import LicenseDropdown from 'edit_channel/sharedComponents/LicenseDropdown';
  import MasteryDropdown from 'edit_channel/sharedComponents/MasteryDropdown';
  import VisibilityDropdown from 'edit_channel/sharedComponents/VisibilityDropdown';
  import FileUpload from 'frontend/channelEdit/views/files/FileUpload';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import SubtitlesList from 'frontend/channelEdit/views/files/supplementaryLists/SubtitlesList';
  import Thumbnail from 'frontend/channelEdit/views/files/thumbnails/Thumbnail';

  // Define an object to act as the place holder for non unique values.
  const nonUniqueValue = {};
  nonUniqueValue.toString = () => '';

  function getValueFromResults(results) {
    if (results.length === 0) {
      return null;
    } else if (results.length === 1) {
      return results[0];
    } else {
      return nonUniqueValue;
    }
  }

  function generateGetterSetter(key) {
    return {
      get() {
        return this.getValueFromNodes(key);
      },
      set(value) {
        if (!this.viewOnly) {
          this.update({ [key]: value });
        }
      },
    };
  }

  function generateExtraFieldsGetterSetter(key) {
    return {
      get() {
        return this.getExtraFieldsValueFromNodes(key);
      },
      set(value) {
        if (!this.viewOnly) {
          this.updateExtraFields({ [key]: value });
        }
      },
    };
  }

  export default {
    name: 'DetailsTabView',
    components: {
      LanguageDropdown,
      HelpTooltip,
      LicenseDropdown,
      MasteryDropdown,
      VisibilityDropdown,
      FileUpload,
      ActionLink,
      SubtitlesList,
      Thumbnail,
    },
    props: {
      viewOnly: {
        type: Boolean,
        default: true,
      },
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        tagText: null,
        valid: true,
      };
    },
    computed: {
      ...mapGetters('contentNode', [
        'getContentNodes',
        'authors',
        'providers',
        'aggregators',
        'copyrightHolders',
        'tags',
      ]),
      ...mapGetters('currentChannel', ['currentChannel']),
      ...mapGetters('file', ['getFiles']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      firstNode() {
        return this.nodes.length ? this.nodes[0] : null;
      },
      allExercises() {
        return this.nodes.every(node => node.kind === 'exercise');
      },
      allResources() {
        return !this.nodes.some(node => node.kind === 'topic');
      },

      /* FORM FIELDS */
      title: generateGetterSetter('title'),
      description: generateGetterSetter('description'),
      randomizeOrder: generateExtraFieldsGetterSetter('randomize'),
      author: generateGetterSetter('author'),
      provider: generateGetterSetter('provider'),
      aggregator: generateGetterSetter('aggregator'),
      copyright_holder: generateGetterSetter('copyright_holder'),
      contentTags: {
        get() {
          return intersection(...this.nodes.map(node => node.tags));
        },
        set(newValue, oldValue) {
          if (!this.viewOnly) return;

          // If selecting a tag, clear the text field
          if (newValue.length > oldValue.length) {
            this.tagText = null;
            this.addTags(difference(newValue, oldValue));
          } else {
            this.removeTags(difference(oldValue, newValue));
          }
        },
      },
      role: generateGetterSetter('role_visibility'),
      language: generateGetterSetter('language'),
      mastery_model() {
        return this.getExtraFieldsValueFromNodes('mastery_model');
      },
      m() {
        return this.getExtraFieldsValueFromNodes('m');
      },
      n() {
        return this.getExtraFieldsValueFromNodes('n');
      },
      masteryModelItem: {
        get() {
          return {
            mastery_model: this.mastery_model,
            m: this.m,
            n: this.n,
          };
        },
        set(value) {
          this.updateExtraFields(value);
        },
      },
      license() {
        return this.getValueFromNodes('license');
      },
      license_description() {
        return this.getValueFromNodes('license_description');
      },
      licenseItem: {
        get() {
          return {
            license: this.license,
            license_description: this.license_description,
          };
        },
        set(value) {
          this.update(value);
        },
      },
      extra_fields() {
        return this.getValueFromNodes('extra_fields');
      },
      thumbnail: {
        get() {
          return this.nodeFiles.find(f => f.preset.thumbnail);
        },
        set(file) {
          file
            ? this.addFiles({ id: this.firstNode.id, files: [file] })
            : this.removeFiles({ id: this.firstNode.id, files: [this.thumbnail.id] });
        },
      },
      thumbnailEncoding: generateGetterSetter('thumbnail_encoding'),

      /* COMPUTED PROPS */
      disableAuthEdits() {
        return this.nodes.some(node => node.freeze_authoring_data);
      },
      oneSelected() {
        return this.nodeIds.length === 1;
      },
      languageHint() {
        if (this.viewOnly) return '';
        let topLevel = this.nodes.some(node => node.parent === this.currentChannel.main_tree);
        return topLevel ? this.$tr('languageChannelHelpText') : this.$tr('languageHelpText');
      },
      copyrightHolderRequired() {
        // Needs to appear when any of the selected licenses require a copyright holder
        return this.nodes.some(node => {
          return Boolean(
            Constants.Licenses.find(
              license => license.id === node.license && license.copyright_holder_required
            )
          );
        });
      },
      isImported() {
        return this.firstNode && this.firstNode.node_id !== this.firstNode.original_source_node_id;
      },
      importUrl() {
        return (
          this.firstNode &&
          window.Urls.channel(this.firstNode.original_channel.id) +
            '/' +
            this.firstNode.original_source_node_id
        );
      },
      importChannelName() {
        return this.firstNode && this.firstNode.original_channel.name;
      },
      titleRules() {
        return [v => !!v || this.$tr('titleValidationMessage')];
      },
      copyrightHolderRules() {
        return [
          v =>
            this.disableAuthEdits ||
            !this.isUnique(this.copyright_holder) ||
            Boolean(v) ||
            this.$tr('copyrightHolderValidationMessage'),
        ];
      },
      nodeFiles() {
        return (this.firstNode && this.getFiles(this.firstNode.files)) || [];
      },
      primaryFile() {
        let file = this.nodeFiles.find(f => !f.preset.supplementary && f.file_on_disk);
        return (file && file.file_on_disk.split('?')[0]) || '';
      },
      videoSelected() {
        return this.oneSelected && this.firstNode.kind === 'video';
      },
      newContent() {
        return !this.nodes.some(n => n.isNew);
      },
    },
    watch: {
      nodes: {
        deep: true,
        handler() {
          // Handles both when loading a node and when making a change
          this.$nextTick(this.handleValidation);
        },
      },
    },
    mounted() {
      this.$nextTick(this.handleValidation);
    },
    methods: {
      ...mapActions('contentNode', [
        'updateContentNodes',
        'addTags',
        'removeTags',
        'addFiles',
        'removeFiles',
      ]),
      update(payload) {
        this.updateContentNodes({ ids: this.nodeIds, ...payload });
      },
      updateExtraFields(payload) {
        this.updateContentNodes({ ids: this.nodeIds, extra_fields: payload });
      },
      addTags(tags) {
        this.addTags({ ids: this.nodeIds, tags });
      },
      removeTags(tags) {
        this.removeTags({ ids: this.nodeIds, tags });
      },
      isUnique(value) {
        return value !== nonUniqueValue;
      },
      getValueFromNodes(key) {
        let results = uniq(this.nodes.map(node => node[key]));
        return getValueFromResults(results);
      },
      getExtraFieldsValueFromNodes(key) {
        let results = uniq(this.nodes.map(node => node.extra_fields[key]));
        return getValueFromResults(results);
      },
      getPlaceholder(field) {
        // Should only show if multiple nodes are selected with different
        // values for the field (e.g. if author field is different on the selected nodes)
        return this.oneSelected || this.isUnique(this[field])
          ? ''
          : this.$tr('variedFieldPlaceholder');
      },
      handleValidation() {
        if (this.$refs.form && !this.viewOnly) {
          !this.newContent ? this.$refs.form.resetValidation() : this.$refs.form.validate();
        }
      },
      setEncoding(encoding) {
        this.thumbnailEncoding = encoding;
      },
    },
    $trs: {
      basicInfoHeader: 'Basic information',
      audienceHeader: 'Audience',
      sourceHeader: 'Source',
      assessmentHeader: 'Assessment options',
      thumbnailHeader: 'Thumbnail',
      titleLabel: 'Title',
      titleValidationMessage: 'Title is required',
      languageHelpText: 'Leave blank to default to topic language',
      languageChannelHelpText: 'Leave blank to default to channel language',
      importedFromButtonText: 'Imported from {channel}',
      detectedImportText: 'Read-only: content has been imported with view-only permission',
      authorLabel: 'Author',
      authorToolTip: 'Person or organization who created this content',
      providerLabel: 'Provider',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorLabel: 'Aggregator',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      copyrightHolderLabel: 'Copyright Holder',
      copyrightHolderValidationMessage: 'Copyright holder is required',
      descriptionLabel: 'Description',
      tagsLabel: 'Tags',
      variedFieldPlaceholder: '---',
      noTagsFoundText: 'No results matching "{text}". Press \'enter\'to create a new tag',
      randomizeQuestionLabel: 'Randomize question order for learners',
    },
  };

</script>

<style lang="less" scoped>

  @space-between-sections: 64px;

  /deep/ a,
  /deep/ a:hover {
    color: inherit;
    text-decoration: none;
  }

  /deep/ .error--text {
    font-weight: bold;
  }

  .details-edit-view {
    max-width: 1800px;
    padding: 10px;

    /deep/ .subheading {
      margin-bottom: 8px;
      font-weight: bold;
    }
    .section .flex {
      margin: 24px 0 !important;
    }
    .auth-section {
      /deep/ .v-autocomplete {
        /deep/ .v-input__append-inner {
          visibility: hidden;
        }
      }
    }

    .v-form {
      margin-top: 30px;
      .tagbox /deep/ .v-chip__content {
        color: black; // Read-only tag box grays out tags
      }

      /deep/ .v-input--is-readonly {
        /deep/ label {
          color: var(--v-grey-darken2) !important;
        }
        /deep/ .v-input__append-inner {
          display: none;
        }
        /deep/ .v-input__slot {
          &::before {
            border-style: dotted;
          }
          &::after {
            border: 0;
          }
        }
      }
    }
  }

</style>
