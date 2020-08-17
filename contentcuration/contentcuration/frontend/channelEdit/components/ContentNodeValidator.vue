<template>

  <span v-if="error">
    <VTooltip bottom>
      <template #activator="{ on }">
        <Icon color="red" v-on="on">error</Icon>
      </template>
      <span>{{ error }}</span>
    </VTooltip>
  </span>

</template>
<script>

  /*
  	Possible invalid criteria
  	- Title is blank
  	- No files attached to resource
  	- License isn't specified
  	- Copyright holder isn't set on non-public domain licenses
  	- License description isn't provided on special permissions licenses
  	- Mastery model isn't specified on exercises
  	- Exercise has no questions
  	- Exercise question has no right answers
  */
  import Licenses from 'shared/leUtils/Licenses';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  export default {
    name: 'ContentNodeValidator',
    props: {
      node: {
        type: Object,
      },
    },
    computed: {
      isResource() {
        return this.node.kind !== ContentKindsNames.TOPIC;
      },
      isExercise() {
        return this.node.kind === ContentKindsNames.EXERCISE;
      },
      error() {
        const license = Licenses.get(this.node.license);
        // Title is blank
        if (!this.node.title) {
          return this.$tr('noTitleError');
        }
        // License isn't specified
        else if (this.isResource && !license) {
          return this.$tr('noLicenseError');
        }
        // Copyright holder isn't set on non-public domain licenses
        else if (
          this.isResource &&
          license.copyright_holder_required &&
          !this.node.copyright_holder
        ) {
          return this.$tr('noCopyrightHolderError');
        }
        // License description isn't provided on special permissions licenses
        else if (this.isResource && license.is_custom && !this.node.license_description) {
          return this.$tr('noLicenseDescriptionError');
        }
        // Mastery model isn't specified on exercise
        else if (this.isExercise && !this.node.extra_fields.mastery_model) {
          return this.$tr('noMasteryModelError');
        }
        return '';
      },
    },
    /*
  	Possible invalid criteria
  	- No files attached to resource
  	- Exercise has no questions
  	- Exercise question has no right answers
  */
    $trs: {
      noTitleError: 'No title',
      noLicenseError: 'No license',
      noCopyrightHolderError: 'No copyright holder',
      noLicenseDescriptionError: 'No license description',
      noMasteryModelError: 'No mastery model',
    },
  };

</script>
