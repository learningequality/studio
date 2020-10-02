<template>

  <div v-if="nodes.length" class="details-edit-view">
    <VForm ref="form" v-model="valid" :lazy-validation="newContent">
      <!-- File upload and preview section -->
      <template v-if="oneSelected && allResources && !allExercises">
        <FileUpload
          v-if="oneSelected && allResources && !allExercises"
          :key="firstNode.id"
          :nodeId="firstNode.id"
        />
        <VDivider />
      </template>

      <!-- Basic information + audience -->
      <VLayout row wrap class="section">
        <VFlex v-if="oneSelected" xs12 sm6 lg7>
          <h1 class="subheading">
            {{ $tr('basicInfoHeader') }}
          </h1>
          <!-- Title -->
          <VTextField
            ref="title"
            v-model="title"
            :counter="200"
            maxlength="200"
            :rules="titleRules"
            :label="$tr('titleLabel')"
            autofocus
            required
            box
          />
          <!-- Description -->
          <VTextarea
            ref="description"
            v-model="description"
            :label="$tr('descriptionLabel')"
            :counter="400"
            autoGrow
            box
          />
        </VFlex>
        <VSpacer v-if="oneSelected" />
        <VFlex xs12 sm5 lg4 xl3>
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
            clearable
            persistent-hint
          />

          <!-- Visibility -->
          <VisibilityDropdown
            v-if="allResources"
            ref="role_visibility"
            v-model="role"
            :placeholder="getPlaceholder('role')"
            :required="isUnique(role)"
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
            chips
            box
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
          <VFlex xs12 sm6 class="auth-section">
            <h1 class="subheading">
              {{ $tr('sourceHeader') }}
            </h1>
            <p v-if="disableAuthEdits" class="grey--text">
              {{ detectedImportText }}
            </p>
            <p v-if="oneSelected && importUrl">
              <ActionLink
                :href="importUrl"
                target="_blank"
                :text="$tr('importedFromButtonText', {channel: importChannelName})"
              />
            </p>

            <!-- Need to break up v-model to properly show placeholder -->

            <!-- Author -->
            <VCombobox
              ref="author"
              :items="authors"
              :label="$tr('authorLabel')"
              :readonly="disableAuthEdits"
              maxlength="200"
              autoSelectFirst
              box
              :placeholder="getPlaceholder('author')"
              :value="author && author.toString()"
              @input.native="e => author = e.srcElement.value"
            >
              <template v-slot:append-outer>
                <HelpTooltip :text="$tr('authorToolTip')" top />
              </template>
            </VCombobox>

            <!-- Provider -->
            <VCombobox
              ref="provider"
              :items="providers"
              :label="$tr('providerLabel')"
              :readonly="disableAuthEdits"
              maxlength="200"
              :placeholder="getPlaceholder('provider')"
              autoSelectFirst
              box
              :value="provider && provider.toString()"
              @input.native="e => provider = e.srcElement.value"
            >
              <template v-slot:append-outer>
                <HelpTooltip :text="$tr('providerToolTip')" top />
              </template>
            </VCombobox>

            <!-- Aggregator -->
            <VCombobox
              ref="aggregator"
              :items="aggregators"
              :label="$tr('aggregatorLabel')"
              :readonly="disableAuthEdits"
              maxlength="200"
              autoSelectFirst
              :placeholder="getPlaceholder('aggregator')"
              box
              :value="aggregator && aggregator.toString()"
              @input.native="e => aggregator = e.srcElement.value"
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
              :readonly="disableAuthEdits"
              :placeholder="getPlaceholder('license')"
              :descriptionPlaceholder="getPlaceholder('license_description')"
            />

            <!-- Copyright Holder -->
            <VCombobox
              v-if="copyrightHolderRequired"
              ref="copyright_holder"
              :items="copyrightHolders"
              :label="$tr('copyrightHolderLabel')"
              maxlength="200"
              :required="isUnique(copyright_holder) && !disableAuthEdits"
              :rules="copyrightHolderRules"
              :placeholder="getPlaceholder('copyright_holder')"
              autoSelectFirst
              :readonly="disableAuthEdits"
              box
              :value="copyright_holder && copyright_holder.toString()"
              @input.native="e => copyright_holder = e.srcElement.value"
              @input="e => copyright_holder = e"
            />
          </VFlex>
          <VSpacer />
        </template>

        <VFlex v-if="oneSelected" xs12 sm5 lg4 xl3>
          <h1 class="subheading">
            {{ $tr('thumbnailHeader') }}
          </h1>
          <!-- Thumbnail -->
          <div style="width:250px;">
            <ContentNodeThumbnail
              v-model="thumbnail"
              :nodeId="firstNode.id"
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
          />

          <!-- Randomize question order -->
          <Checkbox
            ref="randomize"
            v-model="randomizeOrder"
            :label="$tr('randomizeQuestionLabel')"
            :indeterminate="!isUnique(randomizeOrder)"
          />
        </VFlex>
      </VLayout>

      <!-- Subtitles -->
      <VLayout v-if="videoSelected" row wrap class="section">
        <VFlex xs12>
          <VDivider />
        </VFlex>
        <VFlex xs12 md8 lg7>
          <SubtitlesList :nodeId="firstNode.id" />
        </VFlex>
      </VLayout>
    </VForm>
  </div>

</template>

<script>

  import debounce from 'lodash/debounce';
  import difference from 'lodash/difference';
  import intersection from 'lodash/intersection';
  import uniq from 'lodash/uniq';
  import { mapGetters, mapActions } from 'vuex';
  import ContentNodeThumbnail from '../../views/files/thumbnails/ContentNodeThumbnail';
  import FileUpload from '../../views/files/FileUpload';
  import SubtitlesList from '../../views/files/supplementaryLists/SubtitlesList';
  import {
    isNodeComplete,
    getTitleValidators,
    getCopyrightHolderValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { findLicense } from 'shared/utils/helpers';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import LicenseDropdown from 'shared/views/LicenseDropdown';
  import MasteryDropdown from 'shared/views/MasteryDropdown';
  import VisibilityDropdown from 'shared/views/VisibilityDropdown';
  import Checkbox from 'shared/views/form/Checkbox';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

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
        this.update({ [key]: value });
      },
    };
  }

  function generateExtraFieldsGetterSetter(key) {
    return {
      get() {
        return this.getExtraFieldsValueFromNodes(key);
      },
      set(value) {
        this.updateExtraFields({ [key]: value });
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
      SubtitlesList,
      ContentNodeThumbnail,
      Checkbox,
    },
    props: {
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        tagText: null,
        valid: true,
        diffTracker: {},
      };
    },
    computed: {
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodes',
        'authors',
        'providers',
        'aggregators',
        'copyrightHolders',
        'tags',
      ]),
      ...mapGetters('assessmentItem', ['getAssessmentItems']),
      ...mapGetters('currentChannel', ['currentChannel']),
      ...mapGetters('file', ['getContentNodeFiles']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      firstNode() {
        return this.nodes.length ? this.nodes[0] : null;
      },
      allExercises() {
        return this.nodes.every(node => node.kind === ContentKindsNames.EXERCISE);
      },
      allResources() {
        return !this.nodes.some(node => node.kind === ContentKindsNames.TOPIC);
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
          // If selecting a tag, clear the text field
          if (newValue.length > (oldValue || []).length) {
            this.tagText = null;
            this.addNodeTags(difference(newValue, oldValue));
          } else {
            this.removeNodeTags(difference(oldValue, newValue));
          }
        },
      },
      role: generateGetterSetter('role_visibility'),
      language: generateGetterSetter('language'),
      mastery_model() {
        return this.getExtraFieldsValueFromNodes('type');
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
            type: this.mastery_model,
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
          file ? this.createFile(file) : this.deleteFile(this.thumbnail);
        },
      },
      thumbnailEncoding: generateGetterSetter('thumbnail_encoding'),

      /* COMPUTED PROPS */
      disableAuthEdits() {
        return this.nodes.some(node => node.freeze_authoring_data);
      },
      detectedImportText() {
        const count = this.nodes.filter(node => node.freeze_authoring_data).length;
        return this.$tr('detectedImportText', { count });
      },
      oneSelected() {
        return this.nodes.length === 1;
      },
      languageHint() {
        let topLevel = this.nodes.some(node => node.parent === this.currentChannel.main_tree);
        return topLevel ? this.$tr('languageChannelHelpText') : this.$tr('languageHelpText');
      },
      copyrightHolderRequired() {
        // Needs to appear when any of the selected licenses require a copyright holder
        return this.nodes.some(
          node =>
            findLicense(node.license, { copyright_holder_required: false })
              .copyright_holder_required
        );
      },
      importUrl() {
        if (
          this.firstNode &&
          this.firstNode.original_source_node_id &&
          this.firstNode.node_id !== this.firstNode.original_source_node_id
        ) {
          return (
            this.firstNode &&
            window.Urls.channel(this.firstNode.original_channel_id) +
              '/' +
              this.firstNode.original_source_node_id
          );
        }
        return null;
      },
      importChannelName() {
        return this.firstNode && this.firstNode.original_channel_name;
      },
      titleRules() {
        return getTitleValidators().map(translateValidator);
      },
      copyrightHolderRules() {
        if (this.disableAuthEdits || !this.isUnique(this.copyright_holder)) {
          return [];
        }
        return getCopyrightHolderValidators().map(translateValidator);
      },
      nodeFiles() {
        return (this.firstNode && this.getContentNodeFiles(this.firstNode.id)) || [];
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
          this.tagText = null;
          this.$nextTick(this.handleValidation);
        },
      },
      diffTracker: {
        deep: true,
        handler: debounce(
          function() {
            Object.keys(this.diffTracker).forEach(async (id) => {
              await this.updateContentNode({ id, ...this.diffTracker[id] });
              delete this.diffTracker[id];
            });
          },
          1000,
          { trailing: true }
        ),
      },
    },
    mounted() {
      this.$nextTick(this.handleValidation);
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode', 'addTags', 'removeTags']),
      ...mapActions('file', ['createFile', 'deleteFile']),
      update(payload) {
        this.nodeIds.forEach(id => {
          const node = this.getContentNode(id);
          const newNodeDetails = {
            ...node,
            ...payload,
          };
          let assessmentItems = [];
          if (node.kind === ContentKindsNames.EXERCISE) {
            assessmentItems = this.getAssessmentItems(id);
          }
          let files = [];
          if (node.kind !== ContentKindsNames.TOPIC && node.kind !== ContentKindsNames.EXERCISE) {
            files = this.getContentNodeFiles(id);
          }
          const complete = isNodeComplete({ nodeDetails: newNodeDetails, assessmentItems, files });

          this.$set(this.diffTracker, id, {
            ...(this.diffTracker[id] || {}),
            ...payload,
            complete,
          });
        });
      },
      updateExtraFields(extra_fields) {
        this.nodeIds.forEach(id => {
          const existingData = this.diffTracker[id] || {};
          this.$set(this.diffTracker, id, {
            ...existingData,
            extra_fields: {
              ...(existingData.extra_fields || {}),
              ...extra_fields,
            },
          });
        });
      },
      addNodeTags(tags) {
        this.addTags({ ids: this.nodeIds, tags });
      },
      removeNodeTags(tags) {
        this.removeTags({ ids: this.nodeIds, tags });
      },
      isUnique(value) {
        return value !== nonUniqueValue;
      },
      getValueFromNodes(key) {
        let results = uniq(this.nodes.map(node => node[key] || null));
        return getValueFromResults(results);
      },
      getExtraFieldsValueFromNodes(key) {
        let results = uniq(this.nodes.map(node => node.extra_fields[key] || null));
        return getValueFromResults(results);
      },
      getPlaceholder(field) {
        // Should only show if multiple nodes are selected with different
        // values for the field (e.g. if author field is different on the selected nodes)
        return this.oneSelected || this.isUnique(this[field]) ? '' : '---';
      },
      handleValidation() {
        if (this.$refs.form) {
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
      languageHelpText: 'Leave blank to use the topic language',
      languageChannelHelpText: 'Leave blank to use the channel language',
      importedFromButtonText: 'Imported from {channel}',
      detectedImportText:
        '{count, plural,\n =1 {# resource has view-only permission}\n other {# resources have view-only permission}}',
      authorLabel: 'Author',
      authorToolTip: 'Person or organization who created this content',
      providerLabel: 'Provider',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorLabel: 'Aggregator',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      copyrightHolderLabel: 'Copyright holder',
      descriptionLabel: 'Description',
      tagsLabel: 'Tags',
      noTagsFoundText: 'No results found for "{text}". Press \'Enter\' key to create a new tag',
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

  .details-edit-view {
    padding: 10px;

    /deep/ .subheading {
      margin-bottom: 8px;
      font-weight: bold;
    }
    .section .flex {
      margin: 24px 0 !important;
    }
    .auth-section {
      /deep/ .v-autocomplete .v-input__append-inner {
        visibility: hidden;
      }
    }

    .v-form {
      margin-top: 30px;
      .tagbox {
        /deep/ .v-select__selections {
          min-height: 0 !important;
        }
        /deep/ .v-chip__content {
          color: black; // Read-only tag box grays out tags
        }
        /deep/ .v-input__append-inner {
          display: none;
        }
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
