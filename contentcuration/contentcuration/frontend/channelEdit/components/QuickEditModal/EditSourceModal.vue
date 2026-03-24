<template>

  <div>
    <KModal
      :title="$tr('editAttribution')"
      :submitText="$tr('saveAction')"
      :cancelText="$tr('cancelAction')"
      data-test="edit-source-modal"
      @submit="handleSave"
      @cancel="close"
    >
      <p
        v-if="resourcesSelectedText.length > 0"
        data-test="resources-selected-message"
      >
        {{ resourcesSelectedText }}
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
            aria-describedby="tooltip-author"
          />
          <HelpTooltip
            :text="$tr('authorToolTip')"
            tooltipId="tooltip-author"
            maxWidth="300px"
            class="input-tooltip"
          />
        </div>
        <p
          v-if="helpText"
          class="help"
        >
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
            aria-describedby="tooltip-provider"
          />
          <HelpTooltip
            :text="$tr('providerToolTip')"
            maxWidth="300px"
            class="input-tooltip"
            tooltipId="tooltip-provider"
          />
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
            aria-describedby="tooltip-aggregator"
          />
          <HelpTooltip
            :text="$tr('aggregatorToolTip')"
            maxWidth="300px"
            class="input-tooltip"
            tooltipId="tooltip-aggregator"
          />
        </div>
      </div>
      <div class="form-item">
        <div class="input-container">
          <LicenseDropdown
            v-model="licenseItem"
            box
            :required="isEditable"
            :disabled="!isEditable"
            :helpText="helpText"
          />
        </div>
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
        <p
          v-if="helpText"
          class="help"
        >
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
  import commonStrings from 'shared/translator';

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

  const hasChanged = function (newValue, oldValue) {
    this.changed = newValue !== oldValue;
  };

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
      resourcesSelectedText: {
        type: String,
        default: '',
      },
    },
    data() {
      /* eslint-disable  vue/no-unused-properties */
      return {
        author: '',
        provider: '',
        aggregator: '',
        license: '',
        license_description: '',
        copyright_holder: '',
        copyrightHolderError: '',
        changed: false,
      };
      /* eslint-enable  vue/no-unused-properties */
    },
    computed: {
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
    watch: {
      author: hasChanged,
      provider: hasChanged,
      aggregator: hasChanged,
      license: hasChanged,
      license_description: hasChanged,
      copyright_holder: hasChanged,
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
      // reset changed flag
      this.$nextTick(() => {
        this.changed = false;
      });
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      close(changed = false) {
        this.$emit('close', {
          changed: this.hasError ? false : changed,
        });
      },
      validateCopyrightHolder() {
        if (this.copyright_holder === nonUniqueValue) {
          return;
        }
        this.copyrightHolderError = getInvalidText(
          getCopyrightHolderValidators(),
          this.copyright_holder,
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
          }),
        );
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        this.$store.dispatch('showSnackbarSimple', commonStrings.$tr('changesSaved'));
        this.close(this.changed);
      },
    },
    $trs: {
      editAttribution: 'Edit source',
      authorLabel: 'Author',
      authorToolTip: 'Person or organization who created this content',
      providerLabel: 'Provider',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorLabel: 'Aggregator',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      copyrightHolderLabel: 'Copyright holder',
      cannotEditPublic: 'Not editable for resources from public channels',
      editOnlyLocal: 'Edits will be reflected only for local resources',
      mixed: 'Mixed',
      saveAction: 'Save',
      cancelAction: 'Cancel',
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
        top: 2px;
        right: 0;
        margin-left: 20px;
      }

      /deep/ input {
        padding-right: 44px;
      }
    }
  }

</style>
