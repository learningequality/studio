<template>

  <div>
    <KModal
      v-if="!isAboutLicensesModalOpen"
      :title="$tr('editAttribution')"
      :submitText="$tr('saveAction')"
      :cancelText="$tr('cancelAction')"
      data-test="edit-source-modal"
      @submit="handleSave"
      @cancel="close"
    >
      <p v-if="nodeIds.length > 1" data-test="resources-selected-message" style="margin-top: 8px;">
        {{ $tr('resourcesSelected', { count: nodeIds.length }) }}
      </p>
      <div class="form-item">
        <div class="input-container">
          <KTextbox
            v-model="author_value"
            autofocus
            data-test="author-input"
            :maxlength="200"
            :disabled="!isEditable"
            :label="$tr('authorLabel')"
            class="input-textbox"
          />
          <HelpTooltip :text="$tr('authorToolTip')" top :small="false" class="input-tooltip" />
        </div>
        <p v-if="helpText" class="help">
          {{ helpText }}
        </p>
      </div>
      <div class="form-item">
        <div class="input-container">
          <KTextbox
            v-model="provider_value"
            data-test="provider-input"
            :maxlength="200"
            :disabled="!isEditable"
            :label="$tr('providerLabel')"
            class="input-textbox"
          />
          <HelpTooltip :text="$tr('providerToolTip')" top :small="false" class="input-tooltip" />
        </div>
      </div>
      <div class="form-item">
        <div class="input-container">
          <KTextbox
            v-model="aggregator_value"
            data-test="aggregator-input"
            :maxlength="200"
            :disabled="!isEditable"
            :label="$tr('aggregatorLabel')"
            class="input-textbox"
          />
          <HelpTooltip :text="$tr('aggregatorToolTip')" top :small="false" class="input-tooltip" />
        </div>
      </div>
      <div class="form-item">
        <div class="input-container">
          <LicenseDropdown
            v-model="licenseItem"
            box
            :required="isEditable"
            :disabled="!isEditable"
          />
        </div>
        <p v-if="helpText" class="help" style="margin-bottom: 8px">
          {{ helpText }}
        </p>
      </div>
      <div class="form-item">
        <div class="input-container">
          <KTextbox
            v-model="copyright_holder_value"
            data-test="copyright-holder-input"
            showInvalidText
            :maxlength="200"
            :label="$tr('copyrightHolderLabel')"
            :invalid="!!copyrightHolderError"
            :invalidText="copyrightHolderError"
            :disabled="!isEditable"
            class="input-textbox"
            @input="copyrightHolderError = ''"
            @blur="validateCopyrightHolder"
          />
        </div>
        <p v-if="helpText" class="help">
          {{ helpText }}
        </p>
      </div>
    </KModal>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { isDisableSourceEdits } from '../../utils';
  import { nonUniqueValue } from 'shared/constants';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import LicenseDropdown from 'shared/views/LicenseDropdown';
  import { getCopyrightHolderValidators, getInvalidText } from 'shared/utils/validation';

  function generateGetterSetter(key) {
    return {
      get() {
        if (this[key] === nonUniqueValue) {
          return this.$tr('mixed');
        }
        return this[key];
      },
      set(value) {
        this[key] = value;
      },
    };
  }

  function mapFormGettersSetters(keys) {
    return keys.reduce((acc, key) => {
      acc[`${key}_value`] = generateGetterSetter(key);
      return acc;
    }, {});
  }

  const sourceKeys = [
    'author',
    'provider',
    'aggregator',
    'license',
    'license_description',
    'copyright_holder',
  ];

  export default {
    name: 'EditSourceModal',
    components: {
      HelpTooltip,
      LicenseDropdown,
    },
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    data() {
      /* eslint-disable  kolibri/vue-no-unused-properties */
      return {
        author: '',
        provider: '',
        aggregator: '',
        license: '',
        license_description: '',
        copyright_holder: '',
        copyrightHolderError: '',
      };
      /* eslint-enable  kolibri/vue-no-unused-properties */
    },
    computed: {
      ...mapGetters(['isAboutLicensesModalOpen']),
      ...mapGetters('contentNode', ['getContentNodes']),
      ...mapFormGettersSetters(sourceKeys),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      licenseItem: {
        get() {
          const { license, license_description } = this;
          return {
            license,
            license_description,
          };
        },
        set(value) {
          this.license = value.license;
          this.license_description = value.license_description;
        },
      },
      isEditable() {
        return this.nodes.some(node => !isDisableSourceEdits(node));
      },
      hasSomeEditDisabled() {
        return this.nodes.some(node => isDisableSourceEdits(node));
      },
      hasError() {
        return this.copyrightHolderError;
      },
      helpText() {
        if (!this.isEditable) {
          return this.$tr('cannotEditPublic');
        }
        if (this.hasSomeEditDisabled) {
          return this.$tr('editOnlyLocal');
        }
        return '';
      },
    },
    created() {
      const values = {};
      this.nodes.forEach(node => {
        sourceKeys.forEach(prop => {
          if (node[prop]) {
            if (!values[prop]) {
              values[prop] = node[prop];
            } else if (values[prop] !== node[prop]) {
              values[prop] = nonUniqueValue;
            }
          }
        });
      });
      sourceKeys.forEach(prop => {
        this[prop] = values[prop] || '';
      });
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      close() {
        this.$emit('close');
      },
      validateCopyrightHolder() {
        if (this.copyright_holder === nonUniqueValue) {
          return;
        }
        this.copyrightHolderError = getInvalidText(
          getCopyrightHolderValidators(),
          this.copyright_holder
        );
      },
      validate() {
        // License is required, but it is handled by the LicenseDropdown component
        this.validateCopyrightHolder();
      },
      async handleSave() {
        if (!this.isEditable) {
          return this.close();
        }
        this.validate();
        if (this.hasError) {
          return;
        }
        const nodesToEdit = this.nodes.filter(node => !isDisableSourceEdits(node));
        await Promise.all(
          nodesToEdit.map(node => {
            const payload = {
              id: node.id,
            };
            sourceKeys.forEach(prop => {
              const value = this[prop];
              if (value !== nonUniqueValue) {
                payload[prop] = value;
              }
            });
            return this.updateContentNode(payload);
          })
        );

        this.$store.dispatch(
          'showSnackbarSimple',
          this.$tr('editedAttribution', { count: nodesToEdit.length })
        );
        this.close();
      },
    },
    $trs: {
      editAttribution: 'Edit Attribution',
      authorLabel: 'Author',
      authorToolTip: 'Person or organization who created this content',
      providerLabel: 'Provider',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorLabel: 'Aggregator',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      copyrightHolderLabel: 'Copyright holder',
      cannotEditPublic: 'Cannot edit for public channel resources',
      editOnlyLocal: 'Edits will be reflected only for local resources',
      mixed: 'Mixed',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedAttribution:
        'Edited attribution for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>

<style lang="scss" scoped>

  .form-item {
    position: relative;

    &:not(:last-of-type) {
      margin-bottom: 10px;
    }

    > p.help {
      position: absolute;
      bottom: 0;
      left: 10px;
      margin-bottom: 14px;
      font-size: 12px;
      color: var(--v-text-lighten4);
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: flex-start;

      .input-textbox {
        width: 100%;
      }

      .input-tooltip {
        position: absolute;
        right: 12px;
        margin: 14px 0 0 8px;
      }

      /deep/ input {
        padding-right: 40px;
      }
    }
  }

</style>
