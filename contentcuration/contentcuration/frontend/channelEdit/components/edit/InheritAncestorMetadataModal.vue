<template>

  <KModal
    v-if="active"
    data-test="inheritable-metadata-dialog"
    :title="$tr('applyResourceDetailsTitle', { folder: parent.title })"
    :submitText="$tr('continueAction')"
    :cancelText="$tr('cancelAction')"
    @submit="handleContinue"
    @cancel="handleCancel"
  >
    <div>
      <div>
        <p v-if="parentHasNonLanguageMetadata">
          {{ $tr('inheritMetadataDescription') }}
        </p>
        <KCheckbox
          v-if="!!inheritableMetadataItems.categories"
          key="categories"
          :label="categoriesLabels"
          :checked="checks['categories']"
          @change="checks['categories'] = !checks['categories']"
        />
        <KCheckbox
          v-if="!!inheritableMetadataItems.grade_levels"
          key="levels"
          :checked="checks['grade_levels']"
          :label="levelsLabels"
          @change="checks['grade_levels'] = !checks['grade_levels']"
        />
        <KCheckbox
          v-if="!!inheritableMetadataItems.learner_needs"
          key="needs"
          :checked="checks['learner_needs']"
          :label="learnerNeedsLabels"
          @change="checks['learner_needs'] = !checks['learner_needs']"
        />
        <p v-if="!!inheritableMetadataItems.language" class="language-description">
          {{ $tr('updateLanguage') }}
        </p>
        <KCheckbox
          v-if="!!inheritableMetadataItems.language"
          key="language"
          :label="languageLabel"
          :checked="checks['language']"
          @change="checks['language'] = !checks['language']"
        />

      </div>
      <div class="divider"></div>
      <KCheckbox
        :label="$tr('doNotShowThisAgain')"
        :checked="dontShowAgain"
        @change="dontShowAgain = !dontShowAgain"
      />
      <p class="helper-text">
        {{ $tr('doNotShowAgainDescription') }}
      </p>
    </div>
  </KModal>

</template>

<script>

  import { mapActions } from 'vuex';
  import isEmpty from 'lodash/isEmpty';
  import isUndefined from 'lodash/isUndefined';
  import { ContentNode } from 'shared/data/resources';
  import { LevelsLookup, NeedsLookup, CategoriesLookup } from 'shared/constants';
  import LanguagesMap from 'shared/leUtils/Languages';
  import { metadataTranslationMixin } from 'shared/mixins';

  const inheritableFields = ['categories', 'grade_levels', 'language', 'learner_needs'];

  export default {
    name: 'InheritAncestorMetadataModal',
    mixins: [metadataTranslationMixin],

    props: {
      parent: {
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
            this.parent?.extra_fields?.inherited_metadata &&
            Object.keys(this.inheritableMetadataItems).every(
              field => !isUndefined(this.parent.extra_fields.inherited_metadata[field])
            )
        );
      },
      active() {
        return this.parent !== null && !this.closed;
      },
      inheritableMetadataItems() {
        const returnValue = {};
        if (!this.parent) {
          return returnValue;
        }
        if (!isEmpty(this.categories)) {
          returnValue.categories = this.categories;
        }
        if (!isEmpty(this.grade_levels)) {
          returnValue.grade_levels = this.grade_levels;
        }
        if (this.language) {
          returnValue.language = this.language;
        }
        if (!isEmpty(this.learner_needs)) {
          returnValue.learner_needs = this.learner_needs;
        }

        return returnValue;
      },
      fieldsToInherit() {
        return Object.keys(this.inheritableMetadataItems).filter(field => this.checks[field]);
      },
      parentHasNonLanguageMetadata() {
        return (
          !isEmpty(this.categories) || !isEmpty(this.grade_levels) || !isEmpty(this.learner_needs)
        );
      },
      parentHasInheritableMetadata() {
        return !isEmpty(this.inheritableMetadataItems);
      },
      categoriesLabels() {
        const categoryTranslationLabels = Object.keys(this.categories).map(id => {
          return this.translateMetadataString(CategoriesLookup[id]);
        });
        return this.$tr('categories', { categories: categoryTranslationLabels.join(', ') });
      },
      learnerNeedsLabels() {
        const needsTranslationLabels = Object.keys(this.learner_needs).map(id => {
          return this.translateMetadataString(NeedsLookup[id]);
        });
        return this.$tr('learnerNeeds', { learnerNeeds: needsTranslationLabels.join(', ') });
      },
      levelsLabels() {
        const levelsTranslationLabels = Object.keys(this.grade_levels).map(id => {
          return this.translateMetadataString(LevelsLookup[id]);
        });
        return this.$tr('levels', { levels: levelsTranslationLabels.join(', ') });
      },

      languageLabel() {
        const language = LanguagesMap.get(this.language).native_name || this.language.name;
        return this.$tr('language', { language: language });
      },
    },
    watch: {
      parent(newParent, oldParent) {
        if (
          (!oldParent && newParent) ||
          (oldParent && !newParent) ||
          oldParent.id !== newParent.id
        ) {
          this.resetData();
        }
      },
      active(newValue) {
        this.$emit('updateActive', newValue);
      },
    },
    created() {
      this.resetData();
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      /**
       * @public
       */
      checkInheritance() {
        if (this.allFieldsDesignatedByParent || !this.parentHasInheritableMetadata) {
          // If all fields have been designated by the parent, or there is nothing to inherit,
          // automatically continue
          this.handleContinue();
        } else {
          // Wait for the data to be updated before showing the dialog
          this.closed = false;
        }
      },
      resetData() {
        if (this.parent) {
          this.dontShowAgain = false;
          const checks = {};
          for (const field of inheritableFields) {
            checks[field] = true;
          }
          this.checks = checks;
          ContentNode.getAncestors(this.parent.id).then(ancestors => {
            if (!this.parent) {
              // If the parent has been removed before the data is fetched, return
              return;
            }
            for (const field of inheritableFields) {
              if (
                this.parent.extra_fields?.inherited_metadata &&
                !isUndefined(this.parent.extra_fields.inherited_metadata[field])
              ) {
                this.checks[field] = this.parent.extra_fields.inherited_metadata[field];
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
              this.checkInheritance();
            });
          });
        }
      },
      storePreferences() {
        // When the user asks to not show this dialog again, store the preferences
        // so we can use this information in the future to apply metadata automatically
        if (!this.parent) {
          // Shouldn't get to this point if there is no parent
          // but just in case, return
          return;
        }
        const inherited_metadata = {
          ...(this.parent?.extra_fields.inherited_metadata || {}),
        };
        for (const field of inheritableFields) {
          if (this.inheritableMetadataItems[field]) {
            // Only store preferences for fields that have been shown to the user as inheritable
            inherited_metadata[field] = this.checks[field];
          }
        }
        this.updateContentNode({
          id: this.parent.id,
          extra_fields: {
            inherited_metadata,
          },
        });
      },
      handleContinue() {
        const payload = {};
        for (const field of this.fieldsToInherit) {
          if (this.inheritableMetadataItems[field] instanceof Object) {
            payload[field] = {
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
      handleCancel() {
        this.closed = true;
        this.$emit('inherit', {});
      },
    },
    $trs: {
      applyResourceDetailsTitle: "Apply details from the folder '{folder}'",
      /* eslint-disable kolibri/vue-no-unused-translations */
      continueAction: 'Continue',
      cancelAction: 'Cancel',
      inheritMetadataDescription: 'Select details to add:',
      updateLanguage: 'Update language:',
      doNotShowThisAgain: "Don't ask me about this folder again",
      doNotShowAgainDescription:
        'All future additions to this folder will have the selected details by default',
      language: 'Language: {language}',
      categories: 'Categories: {categories}',
      learnerNeeds: 'Requirements: {learnerNeeds}',
      levels: 'Levels: {levels}',
    },
  };

</script>


<style lang="scss" scoped>

  .divider {
    margin: 16px 0;
    border-bottom: 1px solid #e6e6e6;
  }

  .helper-text {
    margin: -8px 32px;
    font-size: 12px;
    color: #9e9e9e;
  }

  .language-description {
    margin: 16px 0 8px;
  }

</style>
