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
    <VForm ref="form" v-model="valid" lazyValidation>
      <!-- Language and import link -->
      <VLayout grid alignTop class="language-section" wrap>
        <VFlex v-if="oneSelected" md4 sm12>
          <VBtn color="primary" flat class="import-link" :href="importUrl" target="_blank">
            {{ $tr('importedFromButtonText', {channel: 'Sample Channel'}) }}
          </VBtn>
        </VFlex>
        <VSpacer />
        <VFlex md4 sm12>
          <LanguageDropdown width="250" :hint="$tr('languageHelpText')" />
        </VFlex>

        <!-- Title -->
        <VFlex xs12>
          <VTextField
            v-if="oneSelected"
            :value="changes.title"
            counter="200"
            maxlength="200"
            :rules="rules.title"
            :label="$tr('titleLabel')"
            autofocus
            required
            lazy
          />
        </VFlex>


        <!-- Visibility -->
        <VFlex sm12 md4>
          <VisibilityDropdown :role="changes.role_visibility" />
        </VFlex>
        <VSpacer />

        <!-- Mastery -->
        <VFlex sm12 md6>
          <MasteryDropdown v-if="allExercises" :mastery="changes.extra_fields" />
        </VFlex>
      </VLayout>

      <!-- Authoring Section -->
      <div v-if="allResources">
        <VDivider />
        <VLayout row class="auth-section" wrap alignTop>
          <!-- Author -->
          <VFlex md4 sm12 class="field-with-tooltip">
            <VCombobox
              v-model="changes.author"
              :items="authors"
              :label="$tr('authorLabel')"
              :disabled="disableAuthEdits"
              maxlength="200"
              autoSelectFirst
            />
            <HelpTooltip :text="$tr('authorToolTip')" />
          </VFlex>

          <!-- Provider -->
          <VFlex md4 sm12 class="field-with-tooltip">
            <VCombobox
              v-model="changes.provider"
              :items="providers"
              :label="$tr('providerLabel')"
              :disabled="disableAuthEdits"
              maxlength="200"
              autoSelectFirst
            />
            <HelpTooltip :text="$tr('providerToolTip')" />
          </VFlex>

          <!-- Aggregator -->
          <VFlex md4 sm12 class="field-with-tooltip">
            <VCombobox
              v-model="changes.aggregator"
              :items="aggregators"
              :label="$tr('aggregatorLabel')"
              :disabled="disableAuthEdits"
              maxlength="200"
              autoSelectFirst
            />
            <HelpTooltip :text="$tr('aggregatorToolTip')" />
          </VFlex>

          <!-- License -->
          <VFlex md5 sm12>
            <LicenseDropdown
              :selectedID="changes.license"
              :disabled="disableAuthEdits"
              @licensechanged="setLicense"
              @descriptionchanged="setLicenseDescription"
            />
          </VFlex>
          <VSpacer />

          <!-- Copyright Holder -->
          <VFlex md5 sm12>
            <VCombobox
              v-if="copyrightHolderRequired"
              v-model="changes.copyright_holder"
              :items="copyrightHolders"
              :label="$tr('copyrightHolderLabel')"
              :disabled="disableAuthEdits"
              maxlength="200"
              required
              :rules="rules.copyrightHolder"
              autoSelectFirst
            />
          </VFlex>
        </VLayout>
        <VDivider />
      </div>

      <!-- Description -->
      <VTextarea
        v-model="changes.description"
        :label="$tr('descriptionLabel')"
        counter="400"
        noResize
      />

      <!-- Tags -->
      <VCombobox
        v-model="changes.tags"
        :items="tags"
        chips
        color="primary"
        :label="$tr('tagsLabel')"
        multiple
        hideSelected
        class="tags-field"
        maxlength="30"
        autoSelectFirst
      >
        <template v-slot:selection="data">
          <VChip
            :selected="data.selected"
            close
            @input="removeTag(data.item)"
          >
            {{ data.item }}
          </VChip>
        </template>
      </VCombobox>
    </VForm>
  </div>
</template>

<!--
  TODOS:
    Use placeholder to show some items already have author/aggregator/provider fields
    Add license info modal link
    Assign license and language
    Add license and mastery validation
    Handle shared data
 -->

<script>

  import _ from 'underscore';
  import { mapGetters, mapState } from 'vuex';
  import Constants from 'edit_channel/constants';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';
  import HelpTooltip from 'edit_channel/sharedComponents/HelpTooltip.vue';
  import LicenseDropdown from 'edit_channel/sharedComponents/LicenseDropdown.vue';
  import MasteryDropdown from 'edit_channel/sharedComponents/MasteryDropdown.vue';
  import VisibilityDropdown from 'edit_channel/sharedComponents/VisibilityDropdown.vue';

  const editableFields = [
    'title',
    'description',
    'license',
    'changed',
    'copyright_holder',
    'author',
    'extra_fields',
    'prerequisite',
    'role_visibility',
    'aggregator',
    'provider',
  ];

  export default {
    name: 'DetailsEditView',
    $trs: {
      viewingMultipleCount: 'Viewing details for {count, plural,\n =1 {# item}\n other {# items}}',
      editingMultipleCount: 'Editing details for {count, plural,\n =1 {# item}\n other {# items}}',
      titleLabel: 'Title *',
      titleValidationMessage: 'Title is required',
      languageHelpText: 'Leave blank to default to topic language',
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
        valid: true,
        rules: {
          title: [v => !!v || this.$tr('titleValidationMessage')],
          copyrightHolder: [v => !!v || this.$tr('copyrightHolderValidationMessage')],
        },
      };
    },
    computed: {
      ...mapState('edit_modal', ['viewOnly']),
      ...mapGetters('edit_modal', [
        'selected',
        'authors',
        'providers',
        'aggregators',
        'copyrightHolders',
        'tags',
      ]),
      changes() {
        let data = _.reduce(
          editableFields,
          (shardData, field) => {
            let fields = _.pluck(this.selected, field);
            if (
              _.every(fields, f => {
                return f === fields[0];
              })
            )
              shardData[field] = fields[0];
            return shardData;
          },
          {}
        );
        data.tags = _.intersection.apply(_, _.pluck(this.selected, 'tags'));
        return data;
      },
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
      allResources() {
        return !_.some(this.selected, { kind: 'topic' });
      },
      allExercises() {
        return _.every(this.selected, { kind: 'exercise' });
      },
      copyrightHolderRequired() {
        return _.findWhere(Constants.Licenses, {
          id: this.changes.license,
          copyright_holder_required: true,
        });
      },
      importUrl() {
        let selected = this.selected[0];
        let baseUrl = window.Urls.channel_view_only(selected.original_channel.id);
        return baseUrl + '/' + selected.original_source_node_id;
      },
    },
    methods: {
      validate() {
        if (this.$refs.form.validate()) {
          this.snackbar = true;
        }
        // TODO: set error message
      },
      setLicense(licenseID) {
        this.changes.license = licenseID;
      },
      setLicenseDescription(description) {
        this.changes.license_description = description;
      },
      removeTag(item) {
        this.changes.tags = _.reject(this.changes.tags, tag => {
          return tag === item;
        });
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
