<template>

  <KModal
    v-if="active"
    data-test="inheritable-metadata-dialog"
    :title="$tr('applyResourceDetailsTitle')"
    :submitText="$tr('continueAction')"
    :cancelText="$tr('cancelAction')"
    @submit="handleContinue"
    @cancel="closed = true"
  >
    <div>
      <p v-if="parentHasInheritableMetadata">
        {{ $tr('inheritMetadataDescription') }}
      </p>
      <div>
        <KCheckbox
          v-if="!!inheritableMetadataItems.categories"
          key="categories"
          :label="generateInheritableCategories(inheritableMetadataItems.categories)"
          :checked="checks['categories']"
          @change="checks['categories'] = !checks['categories']"
        />
        <KCheckbox
          v-if="!!inheritableMetadataItems.grade_levels"
          key="levels"
          :checked="checks['grade_levels']"
          :label="generateInheritableLevels(inheritableMetadataItems.grade_levels)"
          @change="checks['grade_levels'] = !checks['grade_levels']"
        />
        <KCheckbox
          v-if="!!inheritableMetadataItems.learner_needs"
          key="needs"
          :checked="checks['learner_needs']"
          :label="generateInheritableLearnerNeeds(inheritableMetadataItems.learner_needs)"
          @change="checks['learner_needs'] = !checks['learner_needs']"
        />
        <p v-if="!!inheritableMetadataItems.language" class="language-description">
          {{ $tr('updateLanguage') }}
        </p>
        <KCheckbox
          v-if="!!inheritableMetadataItems.language"
          key="language"
          :label="generateInheritableLanguage(inheritableMetadataItems.language)"
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
  import camelCase from 'lodash/camelCase';
  import isUndefined from 'lodash/isUndefined';
  import { ContentNode } from 'shared/data/resources';
  import { ContentLevels, ResourcesNeededTypes, Categories } from 'shared/constants';
  import LanguagesMap from 'shared/leUtils/Languages';
  import { metadataTranslationMixin } from 'shared/mixins';

  const inheritableFields = ['categories', 'grade_levels', 'language', 'learner_needs'];

  export default {
    name: 'InheritAncestorMetadataModal',
    mixins: [metadataTranslationMixin],

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
          !this.closed &&
          this.parentHasInheritableMetadata
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
      parentHasInheritableMetadata() {
        return this.inheritableMetadataItems && !isEmpty(this.inheritableMetadataItems);
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
      generateInheritableCategories(categories) {
        let categoryTranslationKeys = [];
        Object.keys(categories).forEach(id => {
          categoryTranslationKeys.push(Object.keys(Categories).find(key => Categories[key] === id));
        });
        categoryTranslationKeys = categoryTranslationKeys
          .map(key => {
            return this.translateMetadataString(camelCase(key));
          })
          .join(', ');
        return this.$tr('categories', { categories: categoryTranslationKeys });
      },
      generateInheritableLearnerNeeds(learnerNeeds) {
        let learnerNeedsTranslationKeys = [];
        Object.keys(learnerNeeds).forEach(id => {
          learnerNeedsTranslationKeys.push(
            Object.keys(ResourcesNeededTypes).find(key => ResourcesNeededTypes[key] === id)
          );
        });
        learnerNeedsTranslationKeys = learnerNeedsTranslationKeys
          .map(key => {
            return this.translateMetadataString(camelCase(key));
          })
          .join(', ');
        return this.$tr('learnerNeeds', { learnerNeeds: learnerNeedsTranslationKeys });
      },
      generateInheritableLevels(gradeLevels) {
        let gradeLevelsTranslationKeys = [];
        Object.keys(gradeLevels).forEach(id => {
          gradeLevelsTranslationKeys.push(
            Object.keys(ContentLevels).find(key => ContentLevels[key] === id)
          );
        });
        gradeLevelsTranslationKeys = gradeLevelsTranslationKeys
          .map(level => {
            let translationKey;
            if (level === 'PROFESSIONAL') {
              translationKey = 'specializedProfessionalTraining';
            } else if (level === 'WORK_SKILLS') {
              translationKey = 'allLevelsWorkSkills';
            } else if (level === 'BASIC_SKILLS') {
              translationKey = 'allLevelsBasicSkills';
            } else {
              translationKey = this.translateMetadataString(camelCase(level));
            }
            return translationKey;
          })
          .join(', ');
        return this.$tr('levels', { levels: gradeLevelsTranslationKeys });
      },

      generateInheritableLanguage(parentLanguage) {
        const language = LanguagesMap.get(parentLanguage).native_name || parentLanguage;
        return this.$tr('language', { language: language });
      },
    },
    $trs: {
      applyResourceDetailsTitle: 'Apply resource details',
      /* eslint-disable kolibri/vue-no-unused-translations */
      applyResourceDetailsDescriptionUpload:
        'The folder `{folder}` has the following details. Select the details you want to apply to your upload. You can add edit these details and add additional resource information later.',
      applyResourceDetailsDescriptionImport:
        'The folder `{folder}` has the following details. Select the details you want to apply to the {resource, plural, one {resource}, other {resources}} you are importing.',
      applyResourceDetailsDescriptionMoving:
        'The folder `{folder}` has the following details. Select the details you want to apply to the {resource, plural, one {resource}, other {resources}} you are moving.',
      /* eslint-enable kolibri/vue-no-unused-translations */
      continueAction: 'Continue',
      cancelAction: 'Cancel',
      inheritMetadataDescription: 'Add metadata from the folder above',
      updateLanguage: 'Update language to match the folder above',
      doNotShowThisAgain: "Don't ask me about this folder again",
      doNotShowAgainDescription:
        'All future additions to this folder will have the selected information by default',
      language: 'Language: {language}',
      categories: 'Categories: {categories}',
      learnerNeeds: 'Learner needs: {learnerNeeds}',
      levels: 'Levels: {levels}',
    },
  };

</script>


<style lang="less" scoped>

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
