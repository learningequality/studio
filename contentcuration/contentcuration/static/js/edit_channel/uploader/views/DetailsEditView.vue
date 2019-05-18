<template>
  <div class="details-edit-view">
    <div v-if="false">
      <!-- INSERT ERROR MESSAGES HERE -->
    </div>

    <div v-if="oneSelected">
      <!-- INSERT FILE UPLOAD MODULE HERE -->
    </div>

    <p v-if="!oneSelected" class="count-message">
      {{ countText }}
    </p>
    <VForm ref="form" v-model="valid" lazyValidation @input="handleValidation">
      <!-- Language and import link -->
      <VLayout grid alignTop class="language-section" wrap>
        <VFlex v-if="oneSelected && isImported" md4 sm12>
          <VBtn color="primary" flat class="import-link" :href="importUrl" target="_blank">
            {{ $tr('importedFromButtonText', {channel: 'Sample Channel'}) }}
          </VBtn>
        </VFlex>
        <VSpacer />
        <VFlex md4 sm12>
          <LanguageDropdown
            width="250"
            :hint="languageHint"
            :language="changes.language.value"
            :placeholder="getPlaceholder('language')"
            @changed="setLanguage"
          />
        </VFlex>

        <!-- Title -->
        <VFlex xs12>
          <VTextField
            v-if="oneSelected"
            :value="changes.title.value"
            counter="200"
            maxlength="200"
            :rules="rules.title"
            :label="$tr('titleLabel')"
            autofocus
            required
            @change="setTitle"
          />
        </VFlex>


        <!-- Visibility -->
        <VFlex sm12 md4>
          <VisibilityDropdown
            :role="changes.role_visibility.value"
            :placeholder="getPlaceholder('role_visibility')"
            :required="!changes.role_visibility.varied"
            @changed="setVisibility"
          />
        </VFlex>
        <VSpacer />

        <!-- Mastery -->
        <VFlex sm12 md6>
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
            @changed="setExtraFields"
          />
        </VFlex>
      </VLayout>

      <!-- Authoring Section -->
      <div v-if="allResources">
        <VDivider />
        <VLayout row class="auth-section align-top" wrap>
          <VFlex v-if="disableAuthEdits" xs12 class="imports-detected-text">
            {{ $tr('detectedImportText') }}
          </VFlex>

          <!-- Author -->
          <VFlex md4 sm12 class="field-with-tooltip">
            <VCombobox
              :value="changes.author.value"
              :items="authors"
              :label="$tr('authorLabel')"
              :disabled="disableAuthEdits"
              maxlength="200"
              autoSelectFirst
              :placeholder="getPlaceholder('author')"
              @change="setAuthor"
            />
            <HelpTooltip :text="$tr('authorToolTip')" />
          </VFlex>

          <!-- Provider -->
          <VFlex md4 sm12 class="field-with-tooltip">
            <VCombobox
              :value="changes.provider.value"
              :items="providers"
              :label="$tr('providerLabel')"
              :disabled="disableAuthEdits"
              maxlength="200"
              :placeholder="getPlaceholder('provider')"
              autoSelectFirst
              @change="setProvider"
            />
            <HelpTooltip :text="$tr('providerToolTip')" />
          </VFlex>

          <!-- Aggregator -->
          <VFlex md4 sm12 class="field-with-tooltip">
            <VCombobox
              :value="changes.aggregator.value"
              :items="aggregators"
              :label="$tr('aggregatorLabel')"
              :disabled="disableAuthEdits"
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
              :disabled="disableAuthEdits"
              :required="!changes.license.varied"
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
              :disabled="disableAuthEdits"
              maxlength="200"
              :required="!changes.copyright_holder.varied"
              :rules="changes.copyright_holder.varied? [] : rules.copyrightHolder"
              :placeholder="getPlaceholder('copyright_holder')"
              autoSelectFirst
              @input="setCopyrightHolder"
            />
          </VFlex>
        </VLayout>
        <VDivider />
      </div>

      <!-- Description -->
      <VTextarea
        :value="changes.description.value"
        :placeholder="getPlaceholder('description')"
        :label="$tr('descriptionLabel')"
        counter="400"
        noResize
        @change="setDescription"
      />

      <!-- Tags -->
      <VCombobox
        ref="tagbox"
        :value="changes.tags"
        :items="tags"
        :searchInput.sync="tagText"
        chips
        :label="$tr('tagsLabel')"
        multiple
        deletableChips
        hideSelected
        class="tags-field"
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
    name: 'DetailsEditView',
    $trs: {
      viewingMultipleCount: 'Viewing details for {count, plural,\n =1 {# item}\n other {# items}}',
      editingMultipleCount: 'Editing details for {count, plural,\n =1 {# item}\n other {# items}}',
      titleLabel: 'Title *',
      titleValidationMessage: 'Title is required',
      languageHelpText: 'Leave blank to default to topic language',
      languageChannelHelpText: 'Leave blank to default to channel language',
      importedFromButtonText: 'Imported from {channel}',
      detectedImportText: 'READ-ONLY: content has been imported with view-only permission',
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
      descriptionValidationMessage:
        'Too long - recommend removing {data, plural,\n =1 {# character}\n other {# characters}}',
      tagsLabel: 'Tags',
      variedFieldPlaceholder: '---',
      noTagsFoundText: 'No results matching "{text}". Press \'enter\'to create a new tag',
    },
    components: {
      LanguageDropdown,
      HelpTooltip,
      LicenseDropdown,
      MasteryDropdown,
      VisibilityDropdown,
    },
    data() {
      return {
        tagText: null,
        valid: true,
        rules: {
          title: [v => !!v || this.$tr('titleValidationMessage')],
          copyrightHolder: [v => !!v || this.$tr('copyrightHolderValidationMessage')],
        },
      };
    },
    computed: {
      ...mapState('edit_modal', ['viewOnly', 'changes']),
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
      countText() {
        let messageArgs = { count: this.selected.length };
        return this.viewOnly
          ? this.$tr('viewingMultipleCount', messageArgs)
          : this.$tr('editingMultipleCount', messageArgs);
      },
      disableAuthEdits() {
        return _.some(this.selected, { freeze_authoring_data: true });
      },
      oneSelected() {
        return this.selected.length === 1;
      },
      languageHint() {
        let topLevel = !_.some(this.selected, item => item.ancestors.length > 1);
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
        return selected.node_id !== selected.original_source_node_id;
      },
      importUrl() {
        let selected = this.selected[0];
        let baseUrl = window.Urls.channel_view_only(selected.original_channel.id);
        return baseUrl + '/' + selected.original_source_node_id;
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        setValid: 'SET_VALID',
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
      validate() {
        if (this.$refs.form.validate()) {
          // this.snackbar = true;
        }
        // TODO: set error message
      },
      handleValidation(isValid) {
        this.setValid(isValid);
      },
      getPlaceholder(field) {
        return this.changes[field].varied ? this.$tr('variedFieldPlaceholder') : null;
      },
      getExtraFieldPlaceholder(field) {
        return this.changes.extra_fields[field].varied ? this.$tr('variedFieldPlaceholder') : null;
      },
      handleTags(tags) {
        // If selecting a tag, clear the text field
        if (tags.length > this.changes.tags.length) this.tagText = null;
        this.setTags(tags);
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

  .details-edit-view {
    max-width: 1000px;
    padding: 30px;
    margin: 0 auto;
    .count-message {
      padding: 5px;
      font-size: 12pt;
      font-weight: bold;
      color: @gray-700;
      text-align: center;
      background: @blue-100;
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
      /deep/ .language-dropdown {
        width: 250px;
      }
      .flex {
        text-align: center;
      }
      .v-input {
        margin-bottom: 20px;
      }
      .auth-section {
        width: 100%;
        margin: 0 auto;

        .imports-detected-text {
          padding: 5px;
          font-weight: bold;
          color: @gray-700;
          background-color: @gray-200;
        }
        .v-autocomplete {
          /deep/ .v-input__append-inner {
            visibility: hidden;
          }
        }
        .field-with-tooltip {
          .v-autocomplete {
            display: inline-block;
            width: calc(100% - 75px);
          }
          /deep/ .v-icon {
            margin-left: 5px;
            font-size: 14pt;
          }
        }
      }
    }
  }

</style>
