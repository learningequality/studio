<template>

  <KModal
    v-if="active"
    data-test="inheritable-metadata-dialog"
    :title="$tr('applyResourceDetailsTitle')"
    :submitText="$tr('continueAction')"
    :cancelText="$tr('cancelAction')"
    @submit="handleContinue"
    @cancel="close"
  >
    <div class="inherit-metadata-dialog">
      <p class="inherit-metadata-dialog__description">
        {{ $tr('inheritMetadataDescription') }}
      </p>
      <div class="inherit-metadata-dialog-checkboxes">
        <KCheckbox
          v-for="item, key in inheritableMetadataItems"
          :key="key"
          :checked="checks[key]"
          :label="generateLabel(key)"
          @change="checks[key] = !checks[key]"
        />
      </div>
      <div class="divider"></div>
      <KCheckbox
        :label="$tr('doNotShowThisAgain')"
        :checked="dontShowAgain"
        @change="dontShowAgain = !dontShowAgain"
      />
      <p>{{ $tr('doNotShowAgainDescription') }}</p>
    </div>
  </KModal>

</template>

<script>

  import { mapActions } from 'vuex';
  import isEmpty from 'lodash/isEmpty';
  import isUndefined from 'lodash/isUndefined';
  import { ContentNode } from 'shared/data/resources';

  const inheritableFields = ['categories', 'grade_levels', 'language', 'learner_needs'];

  export default {
    name: 'InheritAncestorMetadataModal',
    props: {
      contentNode: {
        type: Object,
        default: null,
      },
    },
    data() {
      const checks = {};
      for (const field of inheritableFields) {
        checks[field] = true;
      }
      return {
        categories: {},
        grade_levels: {},
        language: null,
        learner_needs: {},
        checks,
        parent: null,
        dontShowAgain: false,
        closed: true,
      };
    },
    computed: {
      allFieldsDesignatedByParent() {
        // Check if all fields that could be inherited from the parent have already been selected
        // as to be inherited or not by a previous interaction with the modal.
        return Boolean(
          this.parent &&
            this.parent?.extra_fields?.inherit_metadata &&
            Object.keys(this.inheritableMetadataItems).every(
              field => !isUndefined(this.parent.extra_fields.inherit_metadata[field])
            )
        );
      },
      active() {
        return (
          this.contentNode !== null &&
          this.contentNode.parent &&
          !this.allFieldsDesignatedByParent &&
          !this.closed
        );
      },
      inheritableMetadataItems() {
        const returnValue = {};
        if (!this.contentNode) {
          return returnValue;
        }
        const categories = Object.keys(this.categories)
          .filter(
            key =>
              !Object.keys(this.contentNode['categories'] || {}).some(category =>
                category.startsWith(key)
              )
          )
          .reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {});
        if (!isEmpty(categories)) {
          returnValue.categories = categories;
        }
        const grade_levels = Object.keys(this.grade_levels)
          .filter(key => !(this.contentNode['grade_levels'] || {})[key])
          .reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {});
        if (!isEmpty(grade_levels)) {
          returnValue.grade_levels = grade_levels;
        }
        const language = this.contentNode.language !== this.language ? this.language : null;
        if (language) {
          returnValue.language = language;
        }
        const learner_needs = Object.keys(this.learner_needs)
          .filter(key => !(this.contentNode['learner_needs'] || {})[key])
          .reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {});
        if (!isEmpty(learner_needs)) {
          returnValue.learner_needs = learner_needs;
        }

        return returnValue;
      },
      fieldsToInherit() {
        return Object.keys(this.inheritableMetadataItems).filter(field => this.checks[field]);
      },
    },
    created() {
      if (this.contentNode && this.contentNode.parent) {
        ContentNode.getAncestors(this.contentNode.parent).then(ancestors => {
          this.parent = ancestors[ancestors.length - 1];
          for (const field of inheritableFields) {
            if (
              this.parent.extra_fields.inherit_metadata &&
              this.parent.extra_fields.inherit_metadata[field]
            ) {
              this.checks[field] = this.parent.extra_fields.inherit_metadata[field];
            }
          }
          this.categories = ancestors.reduce((acc, ancestor) => {
            const returnValue = {
              ...acc,
              ...ancestor.categories,
            };
            for (const key in returnValue) {
              if (Object.keys(returnValue).some(k => k.startsWith(key) && k !== key)) {
                // Delete the key if it is a parent category of another key
                delete returnValue[key];
              }
            }
            return returnValue;
          }, {});
          this.grade_levels = ancestors.reduce((acc, ancestor) => {
            return {
              ...acc,
              ...ancestor.grade_levels,
            };
          }, {});
          this.language = ancestors.reduce((acc, ancestor) => {
            return ancestor.language || acc;
          }, null);
          this.learner_needs = ancestors.reduce((acc, ancestor) => {
            return {
              ...acc,
              ...ancestor.learner_needs,
            };
          }, {});
          this.$nextTick(() => {
            if (this.allFieldsDesignatedByParent) {
              // If all fields have been designated by the parent, automatically continue
              this.handleContinue();
            } else {
              // Wait for the data to be updated before showing the dialog
              this.closed = false;
            }
          });
        });
      }
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      storePreferences() {
        // When the user asks to not show this dialog again, store the preferences
        // so we can use this information in the future to apply metadata automatically
        if (!this.parent) {
          // Shouldn't get to this point if there is no parent
          // but just in case, return
          return;
        }
        const inherit_metadata = {
          ...(this.parent?.extra_fields.inherit_metadata || {}),
        };
        for (const field of inheritableFields) {
          if (this.inheritableMetadataItems[field]) {
            // Only store preferences for fields that have been shown to the user as inheritable
            inherit_metadata[field] = this.checks[field];
          }
        }
        this.updateContentNode({
          id: this.parent.id,
          extra_fields: {
            inherit_metadata,
          },
        });
      },
      handleContinue() {
        const payload = {};
        for (const field of this.fieldsToInherit) {
          if (this.inheritableMetadataItems[field] instanceof Object) {
            payload[field] = {
              ...this.contentNode[field],
              ...this.inheritableMetadataItems[field],
            };
          } else {
            payload[field] = this.inheritableMetadataItems[field];
          }
        }
        this.$emit('inherit', payload);
        if (this.dontShowAgain) {
          this.storePreferences();
        }
        this.closed = true;
      },
      generateLabel(item) {
        // TO DO generate label with all of the metadata le-consts, etc.
        return `${item}`;
      },
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      applyResourceDetailsTitle: 'Apply resource details',
      /* eslint-disable kolibri/vue-no-unused-translations */
      applyResourceDetailsDescriptionUpload:
        'The folder `{folder}` has the following details. Select the details you want to apply to your upload.',
      applyResourceDetailsDescriptionImport:
        'The folder `{folder}` has the following details. Select the details you want to apply to the {resource, plural, one {resource}, other {resources}} you are importing.',
      applyResourceDetailsDescriptionMoving:
        'The folder `{folder}` has the following details. Select the details you want to apply to the {resource, plural, one {resource}, other {resources}} you are moving.',
      /* eslint-enable kolibri/vue-no-unused-translations */
      continueAction: 'Continue',
      cancelAction: 'Cancel',
      inheritMetadataDescription: 'Inherit metadata from the folder above',
      doNotShowThisAgain: "Don't ask me about this folder again",
      doNotShowAgainDescription:
        'All future additions to this folder will have the selected information by default',
    },
  };

</script>
