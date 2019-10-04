<template>
  <div v-if="Object.keys(changes).length" class="details-edit-view">
    <VForm ref="form" v-model="valid" :lazyValidation="newContent" :disabled="viewOnly">
      <VLayout grid wrap>
        <!-- File upload and preview section -->
        <FileUpload
          v-if="oneSelected && allResources && !allExercises"
          :key="selectedIndices[0]"
          :nodeIndex="selectedIndices[0]"
        />

        <!-- Title -->
        <VFlex v-if="oneSelected" xs12>
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
        </VFlex>

        <!-- Description -->
        <VFlex v-if="oneSelected" xs12>
          <VTextarea
            ref="description"
            v-model="description"
            :label="$tr('descriptionLabel')"
            :counter="!viewOnly && 400"
            autoGrow
            :readonly="viewOnly"
          />
        </VFlex>

        <!-- Tags -->
        <VFlex xs12>
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

      <v-expansion-panel v-model="panel" expand>
        <v-expansion-panel-content key="audience">
          <template v-slot:header>
            <div class="headline">
              {{ $tr('audienceHeader') }}
            </div>
          </template>
          <v-card>
            <!-- Language -->
            <VFlex sm12 md8 lg6>
              <LanguageDropdown
                ref="language"
                v-model="language"
                :hint="languageHint"
                :placeholder="getPlaceholder('language')"
                :readonly="viewOnly"
              />
            </VFlex>
            <!-- Visibility -->
            <VFlex sm12 md8 lg6>
              <VisibilityDropdown
                v-if="allResources"
                ref="role_visibility"
                v-model="role"
                :placeholder="getPlaceholder('role_visibility')"
                :required="!changes.role_visibility.varied"
                :readonly="viewOnly"
              />
            </VFlex>
          </v-card>
        </v-expansion-panel-content>
        <v-expansion-panel-content v-if="allExercises" key="assessments">
          <template v-slot:header>
            <div class="headline">
              {{ $tr('assessmentHeader') }}
            </div>
          </template>
          <v-card>
            <!-- Mastery -->
            <VFlex sm12>
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
            </VFlex>
            <v-spacer />
            <VFlex sm12>
              <v-checkbox
                v-if="changes.extra_fields"
                ref="randomize"
                v-model="randomizeOrder"
                :label="$tr('randomizeQuestionLabel')"
                :indeterminate="changes.extra_fields.randomize.varied"
                color="primary"
                :readonly="viewOnly"
              />
            </VFlex>
          </v-card>
        </v-expansion-panel-content>
        <v-expansion-panel-content v-if="allResources" key="source">
          <template v-slot:header>
            <div class="headline">
              {{ $tr('sourceHeader') }}
              <span v-if="disableAuthEdits">
                {{ $tr('detectedImportText') }}
              </span>
            </div>
          </template>
          <v-card class="auth-section">
            <VFlex v-if="oneSelected && isImported" xs12>
              <VBtn color="primary" flat class="import-link" :href="importUrl" target="_blank">
                {{ $tr('importedFromButtonText', {channel: importChannelName}) }}
                <v-icon>launch</v-icon>
              </VBtn>
            </VFlex>
            <!-- Author -->
            <VFlex sm12 md8 lg6>
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
            </VFlex>

            <!-- Provider -->
            <VFlex sm12 md8 lg6>
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
            </VFlex>

            <!-- Aggregator -->
            <VFlex sm12 md8 lg6>
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
            </VFlex>

            <!-- License -->
            <VFlex sm12 md8 lg6>
              <LicenseDropdown
                ref="license"
                v-model="license"
                :required="!changes.license.varied && !disableAuthEdits"
                :readonly="viewOnly || disableAuthEdits"
                :descriptionRequired="!changes.license_description.varied && !disableAuthEdits"
                :placeholder="getPlaceholder('license')"
                :descriptionPlaceholder="getPlaceholder('license_description')"
              />
            </VFlex>

            <!-- Copyright Holder -->
            <VFlex sm12 md8 lg6>
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
          </v-card>
        </v-expansion-panel-content>
      </v-expansion-panel>
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

  export default {
    name: 'DetailsTabView',
    $trs: {
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
      audienceHeader: 'Audience',
      assessmentHeader: 'Assessment Options',
      sourceHeader: 'Source',
    },
    components: {
      LanguageDropdown,
      HelpTooltip,
      LicenseDropdown,
      MasteryDropdown,
      VisibilityDropdown,
      FileUpload,
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
        panel: ['audience', 'assessments', 'source'],
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
        'invalidNodes',
      ]),
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
        let baseUrl = window.Urls.channel_view_only(selected.original_channel.id);
        return baseUrl + '/' + selected.original_source_node_id;
      },
      importChannelName() {
        let selected = this.selected[0];
        return selected.original_channel.name;
      },
      newContent() {
        return !!_.some(this.selected, { isNew: true });
      },
      invalidSelected() {
        return _.intersection(this.selectedIndices, this.invalidNodes).length;
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
        setLicense: 'SET_LICENSE',
        setLicenseDescription: 'SET_LICENSE_DESCRIPTION',

        update: 'UPDATE_NODE',
        updateExtraFields: 'UPDATE_EXTRA_FIELDS',
        setTags: 'SET_TAGS',
      }),
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
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  @space-between-sections: 64px;

  /deep/ a,
  /deep/ a:hover {
    color: inherit;
    text-decoration: none;
  }

  /deep/ .error--text {
    font-weight: bold;
  }

  /deep/ .v-input--checkbox .v-label {
    margin-bottom: 0;
    font-weight: normal;
  }

  .details-edit-view {
    max-width: 1800px;
    padding: 10px;

    .v-expansion-panel {
      margin-top: @space-between-sections;
      box-shadow: none !important;
      /deep/ .v-expansion-panel__container {
        border: 0;
        &:hover {
          .v-expansion-panel__header {
            background-color: @gray-200;
          }
        }
        /deep/ .v-expansion-panel__header {
          padding: 0 15px;
          cursor: pointer;

          .headline {
            font-family: @font-family !important;
            span {
              margin-left: 5px;
              font-size: 11pt;
              color: @gray-600;
            }
          }
          /deep/ .v-icon,
          .v-icon {
            margin-right: 10px;
            font-size: 28px;
            vertical-align: bottom;
          }
        }
        /deep/ .v-expansion-panel__body {
          padding: 5px 25px @space-between-sections;
          .layout {
            margin-left: 0;
          }
          .auth-section {
            .import-link {
              margin-left: -15px;
              font-weight: bold;
              text-transform: none;
              .v-icon {
                margin-left: 10px;
                font-size: 12pt;
              }
            }
            .flex {
              padding-right: 30px;
            }
            /deep/ .v-autocomplete {
              /deep/ .v-input__append-inner {
                visibility: hidden;
              }
            }
          }
        }
      }
    }

    .v-form {
      margin-top: 30px;
      .tagbox /deep/ .v-chip__content {
        color: black; // Read-only tag box grays out tags
      }
      .flex:not(:first-child) {
        /deep/ .v-input {
          margin-top: 25px;
        }
        /deep/ .mofn-options .v-input,
        /deep/ .license-description {
          margin-top: 0;
        }
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
