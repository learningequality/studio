<template>

  <div v-if="nodes.length" class="details-edit-view">
    <VForm ref="form" v-model="valid" :disabled="viewOnly">
      <VLayout grid wrap>
        <!-- File upload and preview section -->
        <FileUpload
          v-if="oneSelected && allResources && !allExercises"
          :key="firstNode.id"
          :nodeId="firstNode.id"
          :viewOnly="viewOnly"
        />

        <!-- Title -->
        <VFlex v-if="oneSelected" xs12>
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
                :required="isUnique(role)"
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
            </VFlex>
            <v-spacer />
            <VFlex sm12>
              <v-checkbox
                v-if="extra_fields"
                ref="randomize"
                v-model="randomizeOrder"
                :label="$tr('randomizeQuestionLabel')"
                :indeterminate="!isUnique(randomizeOrder)"
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
                v-model="licenseItem"
                :required="isUnique(license) && isUnique(license_description) && !disableAuthEdits"
                :readonly="viewOnly || disableAuthEdits"
                :placeholder="getPlaceholder('license')"
                :descriptionPlaceholder="getPlaceholder('license_description')"
              />
            </VFlex>

            <!-- Copyright Holder -->
            <VFlex sm12 md8 lg6>
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
          </v-card>
        </v-expansion-panel-content>
      </v-expansion-panel>
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
        panel: ['audience', 'assessments', 'source'],
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
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNodes', 'addTags', 'removeTags']),
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
        return this.isUnique(this[field]) || this.viewOnly
          ? this.$tr('variedFieldPlaceholder')
          : null;
      },
    },
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
            background-color: var(--v-lighten-2);
          }
        }
        /deep/ .v-expansion-panel__header {
          padding: 0 15px;
          cursor: pointer;

          .headline {
            span {
              margin-left: 5px;
              font-size: 11pt;
              color: var(--v-darken-2);
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
