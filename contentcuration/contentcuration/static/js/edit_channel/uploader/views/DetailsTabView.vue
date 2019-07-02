<template>
  <div class="details-edit-view">
    <VForm ref="form" v-model="valid" :lazyValidation="newContent" :disabled="viewOnly">
      <VLayout grid wrap>
        <!-- Title -->
        <VFlex v-if="oneSelected" xs12>
          <VTextField
            :value="changes.title.value"
            :counter="(viewOnly)? null : 200"
            maxlength="200"
            :rules="rules.title"
            :label="$tr('titleLabel') + (viewOnly ? '' : ' *')"
            autofocus
            required
            :readonly="viewOnly"
            class="title-input"
            @change="setTitle"
          />
        </VFlex>

        <!-- Description -->
        <VFlex v-if="oneSelected" xs12>
          <VTextarea
            :value="changes.description.value"
            :label="$tr('descriptionLabel')"
            :counter="!viewOnly && 400"
            autoGrow
            :readonly="viewOnly"
            @change="setDescription"
          />
        </VFlex>

        <!-- Tags -->
        <VFlex xs12>
          <VCombobox
            ref="tagbox"
            :value="changes.tags"
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
            @change="handleTags"
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
            <div>
              <v-icon>people</v-icon> {{ $tr('audienceHeader') }}
            </div>
          </template>
          <v-card>
            <v-layout row wrap>
              <!-- Language -->
              <VFlex lg4 md5 sm12>
                <LanguageDropdown
                  :hint="languageHint"
                  :language="changes.language.value"
                  :placeholder="getPlaceholder('language')"
                  :readonly="viewOnly"
                  @changed="setLanguage"
                />
              </VFlex>
              <VSpacer />

              <!-- Visibility -->
              <VFlex lg4 md5 sm12>
                <VisibilityDropdown
                  :role="changes.role_visibility.value"
                  :placeholder="getPlaceholder('role_visibility')"
                  :required="!changes.role_visibility.varied"
                  :readonly="viewOnly"
                  @changed="setVisibility"
                />
              </VFlex>
            </v-layout>
          </v-card>
        </v-expansion-panel-content>
        <v-expansion-panel-content key="assessments">
          <template v-slot:header>
            <div>
              <v-icon>star</v-icon> {{ $tr('assessmentHeader') }}
            </div>
          </template>
          <v-card>
            <v-layout row wrap>
              <!-- Mastery -->
              <VFlex sm12 md5>
                <MasteryDropdown
                  v-if="allExercises"
                  :masteryModel="changes.extra_fields.mastery_model.value"
                  :placeholder="getExtraFieldPlaceholder('mastery_model')"
                  :required="!changes.extra_fields.mastery_model.varied"
                  :mValue="changes.extra_fields.m.value"
                  :mPlaceholder="getExtraFieldPlaceholder('m')"
                  :mRequired="!changes.extra_fields.m.varied"
                  :nValue="changes.extra_fields.n.value"
                  :nPlaceholder="getExtraFieldPlaceholder('n')"
                  :nRequired="!changes.extra_fields.n.varied"
                  :readonly="viewOnly"
                  @changed="setExtraFields"
                />
              </VFlex>
              <v-spacer />
              <VFlex sm12 md5>
                <v-checkbox
                  v-if="allExercises"
                  :label="$tr('randomizeQuestionLabel')"
                  :inputValue="changes.extra_fields.randomize.value"
                  :indeterminate="changes.extra_fields.randomize.varied"
                  color="primary"
                  :readonly="viewOnly"
                  @change="setQuestionOrderRandomization"
                />
              </VFlex>
            </v-layout>
          </v-card>
        </v-expansion-panel-content>
        <v-expansion-panel-content v-if="allResources" key="source">
          <template v-slot:header>
            <div>
              <v-icon>copyright</v-icon>
              {{ $tr('sourceHeader') }}
              <span v-if="disableAuthEdits">
                {{ $tr('detectedImportText') }}
              </span>
            </div>
          </template>
          <v-card>
            <v-layout row wrap class="auth-section">
              <VFlex v-if="oneSelected && isImported" xs12>
                <VBtn color="primary" flat class="import-link" :href="importUrl" target="_blank">
                  {{ $tr('importedFromButtonText', {channel: 'Sample Channel'}) }}
                </VBtn>
              </VFlex>

              <!-- Author -->
              <VFlex md4 sm12 class="field-with-tooltip">
                <VCombobox
                  :value="changes.author.value"
                  :items="authors"
                  :label="$tr('authorLabel')"
                  :readonly="viewOnly || disableAuthEdits"
                  maxlength="200"
                  autoSelectFirst
                  :placeholder="getPlaceholder('author')"
                  @change="setAuthor"
                />
                <HelpTooltip :text="$tr('authorToolTip')" />
              </VFlex>
              <VSpacer />

              <!-- Provider -->
              <VFlex md4 sm12 class="field-with-tooltip">
                <VCombobox
                  :value="changes.provider.value"
                  :items="providers"
                  :label="$tr('providerLabel')"
                  :readonly="viewOnly || disableAuthEdits"
                  maxlength="200"
                  :placeholder="getPlaceholder('provider')"
                  autoSelectFirst
                  @change="setProvider"
                />
                <HelpTooltip :text="$tr('providerToolTip')" />
              </VFlex>
              <VSpacer />

              <!-- Aggregator -->
              <VFlex md4 sm12 class="field-with-tooltip">
                <VCombobox
                  :value="changes.aggregator.value"
                  :items="aggregators"
                  :label="$tr('aggregatorLabel')"
                  :readonly="viewOnly || disableAuthEdits"
                  maxlength="200"
                  autoSelectFirst
                  :placeholder="getPlaceholder('aggregator')"
                  @change="setAggregator"
                />
                <HelpTooltip :text="$tr('aggregatorToolTip')" />
              </VFlex>

              <!-- License -->
              <VFlex md5 sm12>
                <LicenseDropdown
                  :selectedID="changes.license.value"
                  :licenseDescription="changes.license_description.value"
                  :required="!changes.license.varied"
                  :readonly="viewOnly || disableAuthEdits"
                  :descriptionRequired="!changes.license_description.varied"
                  :placeholder="getPlaceholder('license')"
                  :descriptionPlaceholder="getPlaceholder('license_description')"
                  @licensechanged="setLicense"
                  @descriptionchanged="setLicenseDescription"
                />
              </VFlex>
              <VSpacer />

              <!-- Copyright Holder -->
              <VFlex md5 sm12>
                <VCombobox
                  v-if="copyrightHolderRequired"
                  :value="changes.copyright_holder.value"
                  :items="copyrightHolders"
                  :label="$tr('copyrightHolderLabel')"
                  maxlength="200"
                  :required="!changes.copyright_holder.varied"
                  :rules="rules.copyrightHolder"
                  :placeholder="getPlaceholder('copyright_holder')"
                  autoSelectFirst
                  :readonly="viewOnly || disableAuthEdits"
                  @input="setCopyrightHolder"
                />
              </VFlex>
            </v-layout>
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

  export default {
    name: 'DetailsTabView',
    $trs: {
      titleLabel: 'Title',
      titleValidationMessage: 'Title is required',
      languageHelpText: 'Leave blank to default to topic language',
      languageChannelHelpText: 'Leave blank to default to channel language',
      importedFromButtonText: 'Imported from {channel}',
      detectedImportText: '[Read-only: content has been imported with view-only permission]',
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
        rules: {
          title: [v => !!v || this.$tr('titleValidationMessage')],
          copyrightHolder: [
            v =>
              this.disableAuthEdits ||
              this.changes.copyright_holder.varied ||
              !!v ||
              this.$tr('copyrightHolderValidationMessage'),
          ],
        },
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
      newContent() {
        return !!_.some(this.selected, { isNew: true });
      },
      invalidSelected() {
        return _.intersection(this.selectedIndices, this.invalidNodes).length;
      },
    },
    watch: {
      changes() {
        if (!this.viewOnly) {
          this.$nextTick(() => {
            if (this.$refs.form)
              this.newContent ? this.$refs.form.resetValidation() : this.$refs.form.validate();
          });
        }
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        setTitle: 'SET_TITLE',
        setDescription: 'SET_DESCRIPTION',
        setLicense: 'SET_LICENSE',
        setLicenseDescription: 'SET_LICENSE_DESCRIPTION',
        setCopyrightHolder: 'SET_COPYRIGHT_HOLDER',
        setLanguage: 'SET_LANGUAGE',
        setExtraFields: 'SET_EXTRA_FIELDS',
        setAuthor: 'SET_AUTHOR',
        setProvider: 'SET_PROVIDER',
        setAggregator: 'SET_AGGREGATOR',
        setVisibility: 'SET_VISIBILITY',
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
      handleTags(tags) {
        if (this.viewOnly) return;

        // If selecting a tag, clear the text field
        if (tags.length > this.changes.tags.length) this.tagText = null;
        this.setTags(tags);
      },
      setQuestionOrderRandomization(value) {
        this.setExtraFields({ randomize: value || false });
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  /deep/ a {
    .linked-list-item;
  }

  /deep/ .error--text {
    font-weight: bold;
  }

  /deep/ .v-input--checkbox .v-label {
    margin-bottom: 0;
    font-weight: normal;
  }

  .details-edit-view {
    max-width: 1000px;
    padding: 30px;
    margin: 0 auto;

    .v-expansion-panel {
      margin-top: 50px;
      box-shadow: none !important;
      /deep/ .v-expansion-panel__container {
        border: 0;
        /deep/ .v-expansion-panel__header {
          min-height: 35px;
          padding: 3px 15px;
          font-size: 11pt;
          font-weight: bold;
          color: white;
          /deep/ .v-icon,
          .v-icon {
            margin-right: 10px;
            font-size: 14pt;
            color: white !important;
            vertical-align: bottom;
          }
        }
        /deep/ .v-expansion-panel__body {
          padding: 15px 10px 50px;
          .layout {
            width: 100%;
            margin-left: 0;
            &.auth-section {
              .v-input {
                margin-bottom: 20px;
              }
              .v-autocomplete {
                /deep/ .v-input__append-inner {
                  visibility: hidden;
                }
              }
              .field-with-tooltip {
                .v-autocomplete {
                  display: inline-block;
                  width: calc(100% - 70px);
                }
                /deep/ .v-icon {
                  margin-left: 5px;
                  font-size: 14pt;
                }
              }
            }
          }
        }

        &:nth-child(1) .v-expansion-panel__header {
          background-color: @video-color;
        }
        &:nth-child(2) .v-expansion-panel__header {
          background-color: @exercise-color;
        }
        &:nth-child(3) .v-expansion-panel__header {
          background-color: @html-color;
        }
      }
    }

    .import-link {
      .action-text;

      text-transform: none;
    }

    .imported-disabled-warning {
      font-weight: bold;
      color: @gray-500;
      text-align: center;
    }
    .v-form {
      margin-top: 30px;
      .flex {
        text-align: center;
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
        /deep/ .v-chip {
          color: black;
        }
      }
    }
  }

</style>
