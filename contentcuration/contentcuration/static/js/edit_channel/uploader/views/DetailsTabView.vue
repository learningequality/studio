<template>

  <div v-if="Object.keys(changes).length" class="details-edit-view">
    <div style="width:250px;">
      <Thumbnail
        v-model="thumbnail"
        :kind="selected[0].kind"
        :primaryFilePath="primaryFile"
        :encoding="thumbnailEncoding"
        @encoded="setEncoding"
      />
    </div>
    <VForm ref="form" v-model="valid" :lazyValidation="newContent" :disabled="viewOnly">
      <template v-if="oneSelected && allResources && !allExercises">
        <FileUpload
          :key="selectedIndices[0]"
          :nodeIndex="selectedIndices[0]"
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
            :label="$tr('titleLabel') + (viewOnly ? '' : ' *')"
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
            style="margin-bottom: 16px;"
            :hint="languageHint"
            :placeholder="getPlaceholder('language')"
            :readonly="viewOnly"
          />

          <!-- Visibility -->
          <VisibilityDropdown
            v-if="allResources"
            ref="role_visibility"
            v-model="role"
            :placeholder="getPlaceholder('role_visibility')"
            :required="!changes.role_visibility.varied"
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
              v-model="license"
              :required="!changes.license.varied && !disableAuthEdits"
              :readonly="viewOnly || disableAuthEdits"
              :descriptionRequired="!changes.license_description.varied && !disableAuthEdits"
              :placeholder="getPlaceholder('license')"
              :descriptionPlaceholder="getPlaceholder('license_description')"
            />

            <!-- Copyright Holder -->
            <VCombobox
              v-if="copyrightHolderRequired"
              ref="copyright_holder"
              v-model="copyrightHolder"
              :items="copyrightHolders"
              :label="$tr('copyrightHolderLabel') + (viewOnly || disableAuthEdits ? '' : ' *')"
              maxlength="200"
              :required="!changes.copyright_holder.varied && !disableAuthEdits"
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
            v-if="changes.extra_fields"
            ref="mastery_model"
            v-model="masteryModel"
            :placeholder="getExtraFieldPlaceholder('mastery_model')"
            :required="!changes.extra_fields.mastery_model.varied"
            :mPlaceholder="getExtraFieldPlaceholder('m')"
            :mRequired="!changes.extra_fields.m.varied"
            :nPlaceholder="getExtraFieldPlaceholder('n')"
            :nRequired="!changes.extra_fields.n.varied"
            :readonly="viewOnly"
          />

          <!-- Randomize question order -->
          <VCheckbox
            v-if="changes.extra_fields"
            ref="randomize"
            v-model="randomizeOrder"
            :label="$tr('randomizeQuestionLabel')"
            :indeterminate="changes.extra_fields.randomize.varied"
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
          <SubtitlesList :nodeIndex="selectedIndices[0]" :readonly="viewOnly" />
        </VFlex>
      </VLayout>
    </VForm>
  </div>

</template>

<script>

  import _ from 'underscore';
  import { mapGetters, mapMutations, mapState } from 'vuex';
  import Constants from 'edit_channel/constants';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';
  import HelpTooltip from 'edit_channel/sharedComponents/HelpTooltip.vue';
  import LicenseDropdown from 'edit_channel/sharedComponents/LicenseDropdown.vue';
  import MasteryDropdown from 'edit_channel/sharedComponents/MasteryDropdown.vue';
  import VisibilityDropdown from 'edit_channel/sharedComponents/VisibilityDropdown.vue';
  import FileUpload from 'edit_channel/file_upload/views/FileUpload.vue';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink.vue';
  import SubtitlesList from 'edit_channel/file_upload/views/SubtitlesList.vue';
  import Thumbnail from 'shared/views/Thumbnail.vue';

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
    },
    data() {
      return {
        tagText: null,
        valid: true,
      };
    },
    computed: {
      ...mapState('edit_modal', ['changes', 'selectedIndices']),
      ...mapGetters('edit_modal', [
        'selected',
        'authors',
        'providers',
        'aggregators',
        'copyrightHolders',
        'tags',
        'allExercises',
        'allResources',
      ]),

      /* FORM FIELDS */
      title: {
        get() {
          return this.changes.title.value || '';
        },
        set(value) {
          this.update({ title: value });
        },
      },
      description: {
        get() {
          return this.changes.description.value || '';
        },
        set(value) {
          this.update({ description: value });
        },
      },
      randomizeOrder: {
        get() {
          return this.changes.extra_fields.randomize.value || false;
        },
        set(value) {
          this.updateExtraFields({ randomize: value || false });
        },
      },
      author: {
        get() {
          return this.changes.author.value || '';
        },
        set(value) {
          this.update({ author: value });
        },
      },
      provider: {
        get() {
          return this.changes.provider.value || '';
        },
        set(value) {
          this.update({ provider: value });
        },
      },
      aggregator: {
        get() {
          return this.changes.aggregator.value || '';
        },
        set(value) {
          this.update({ aggregator: value });
        },
      },
      copyrightHolder: {
        get() {
          return this.changes.copyright_holder.value || '';
        },
        set(value) {
          this.update({ copyright_holder: value });
        },
      },
      contentTags: {
        get() {
          return this.changes.tags || [];
        },
        set(value) {
          if (this.viewOnly) return;

          // If selecting a tag, clear the text field
          if (value.length > this.changes.tags.length) this.tagText = null;
          this.setTags(value);
        },
      },
      role: {
        get() {
          return this.changes.role_visibility.value || '';
        },
        set(value) {
          this.update({ role_visibility: value });
        },
      },
      language: {
        get() {
          return this.changes.language.value;
        },
        set(value) {
          this.update({ language: value });
        },
      },
      masteryModel: {
        get() {
          return {
            mastery_model: this.changes.extra_fields.mastery_model.value,
            m: this.changes.extra_fields.m.value,
            n: this.changes.extra_fields.n.value,
          };
        },
        set(value) {
          this.updateExtraFields(value);
        },
      },
      license: {
        get() {
          return {
            license: this.changes.license.value,
            description: this.changes.license_description.value,
          };
        },
        set(value) {
          this.update({ license: value.license, license_description: value.description });
        },
      },
      thumbnail: {
        get() {
          return this.selected[0].files.find(f => f.preset.thumbnail);
        },
        set(file) {
          let index = this.selectedIndices[0];
          file
            ? this.addFileToNode({ index, file })
            : this.removeFileFromNode({ fileID: this.thumbnail.id, index });
        },
      },
      thumbnailEncoding: {
        get() {
          return this.selected[0].thumbnail_encoding;
        },
        set(encoding) {
          this.update({ thumbnail_encoding: encoding });
        },
      },

      /* COMPUTED PROPS */
      disableAuthEdits() {
        return _.some(this.selected, { freeze_authoring_data: true });
      },
      oneSelected() {
        return this.selected.length === 1;
      },
      languageHint() {
        if (this.viewOnly) return '';
        let topLevel = !_.some(this.selected, item => item && item.ancestors.length > 1);
        return topLevel ? this.$tr('languageChannelHelpText') : this.$tr('languageHelpText');
      },
      copyrightHolderRequired() {
        // Needs to appear when any of the selected licenses require a copyright holder
        return _.some(this.selected, node => {
          return !!_.findWhere(Constants.Licenses, {
            id: node.license,
            copyright_holder_required: true,
          });
        });
      },
      isImported() {
        let selected = this.selected[0];
        return selected && selected.node_id !== selected.original_source_node_id;
      },
      importUrl() {
        let selected = this.selected[0];
        let baseUrl = window.Urls.channel(selected.original_channel.id);
        return baseUrl + '/' + selected.original_source_node_id;
      },
      importChannelName() {
        let selected = this.selected[0];
        return selected.original_channel.name;
      },
      newContent() {
        return !!_.some(this.selected, { isNew: true });
      },
      titleRules() {
        return [v => !!v || this.$tr('titleValidationMessage')];
      },
      copyrightHolderRules() {
        return [
          v =>
            this.disableAuthEdits ||
            this.changes.copyright_holder.varied ||
            !!v ||
            this.$tr('copyrightHolderValidationMessage'),
        ];
      },
      primaryFile() {
        let file =
          this.oneSelected &&
          this.selected[0].files.find(f => !f.preset.supplementary && f.file_on_disk);
        return (file && file.file_on_disk.split('?')[0]) || '';
      },
      videoSelected() {
        return this.oneSelected && this.selected[0].kind === 'video';
      },
    },
    watch: {
      changes() {
        if (!this.viewOnly) {
          this.$nextTick(this.handleValidation);
        }
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        updateNode: 'UPDATE_NODE',
        updateNodeExtraFields: 'UPDATE_EXTRA_FIELDS',
        validateNodeDetails: 'VALIDATE_NODE_DETAILS',
        setTags: 'SET_TAGS',
        addFileToNode: 'ADD_FILE_TO_NODE',
        removeFileFromNode: 'REMOVE_FILE_FROM_NODE',
      }),
      update(payload) {
        // this mutation actually mutates all selected nodes
        // TODO: consistent naming and behaviour of old and new mutations
        this.updateNode(payload);

        this.selectedIndices.forEach(nodeIdx => {
          this.validateNodeDetails({ nodeIdx });
        });
      },
      updateExtraFields(payload) {
        // this mutation actually mutates extra fields of all selected nodes
        // TODO: consistent naming and behaviour of old and new mutations
        this.updateNodeExtraFields(payload);

        this.selectedIndices.forEach(nodeIdx => {
          this.validateNodeDetails({ nodeIdx });
        });
      },
      getPlaceholder(field) {
        return this.changes[field].varied || this.viewOnly
          ? this.$tr('variedFieldPlaceholder')
          : null;
      },
      getExtraFieldPlaceholder(field) {
        return this.changes.extra_fields[field].varied || this.viewOnly
          ? this.$tr('variedFieldPlaceholder')
          : null;
      },
      handleValidation() {
        this.$refs.form && this.newContent
          ? this.$refs.form.resetValidation()
          : this.$refs.form.validate();
      },
      setEncoding(encoding) {
        this.thumbnail_encoding = encoding;
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

  @import '../../../../less/global-variables.less';

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
          color: @gray-600 !important;
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
