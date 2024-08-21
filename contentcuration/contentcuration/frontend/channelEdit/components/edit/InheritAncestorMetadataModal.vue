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
          :label="generateLabel(key)"
        />
      </div>
      <div class="divider"></div>
      <KCheckbox
        :label="$tr('doNotShowThisAgain')"
      />
      <p>{{ $tr('doNotShowAgainDescription') }}</p>
    </div>
  </KModal>

</template>

<script>

  import isEmpty from 'lodash/isEmpty';
  import { ContentNode } from 'shared/data/resources';

  export default {
    name: 'InheritAncestorMetadataModal',
    props: {
      contentNode: {
        type: Object,
        default: null,
      },
    },
    data() {
      return {
        categories: {},
        grade_levels: {},
        language: null,
        learner_needs: {},
      };
    },
    computed: {
      active() {
        return (
          this.contentNode !== null &&
          this.contentNode.parent &&
          (!isEmpty(this.categories) ||
            !isEmpty(this.grade_levels) ||
            this.language ||
            !isEmpty(this.learner_needs))
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
    },
    created() {
      if (this.contentNode && this.contentNode.parent) {
        ContentNode.getAncestors(this.contentNode.parent).then(ancestors => {
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
        });
      }
    },
    methods: {
      handleContinue() {
        // TO DO apply metadata to the selected resources, or alternatively, just emit with event
        this.$emit('handleContinue');
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
