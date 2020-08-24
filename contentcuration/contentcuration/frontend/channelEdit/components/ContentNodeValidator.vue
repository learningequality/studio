<template>

  <span v-if="error">
    <span v-if="noTitle" class="red--text">
      <Icon color="red" v-on="on">error</Icon>
      <span class="mx-1">
        {{ $tr('missingTitle') }}
      </span>
    </span>
    <span v-else>
      <VTooltip bottom>
        <template #activator="{ on }">
          <Icon color="red" v-on="on">error</Icon>
        </template>
        <span>{{ error }}</span>
      </VTooltip>
    </span>
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
    - Mastery model m out of n doesn't have M set
    - Mastery model m out of n doesn't have N set
  	- Exercise has no questions
  	- Exercise question has no right answers
  */
  import Licenses from 'shared/leUtils/Licenses';
  import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
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
      license() {
        return Licenses.get(this.node.license);
      },
      // Title is blank
      noTitle() {
        return !this.node.title;
      },
      // License isn't specified
      noLicense() {
        return this.isResource && !this.license;
      },
      // Copyright holder isn't set on non-public domain licenses
      noCopyrightHolder() {
        return (
          this.isResource && this.license.copyright_holder_required && !this.node.copyright_holder
        );
      },
      // License description isn't provided on special permissions licenses
      noLicenseDescription() {
        return this.isResource && this.license.is_custom && !this.node.license_description;
      },
      // No files attached to resource
      noFiles() {
        return this.isResource && !this.isExercise && !this.node.has_files;
      },
      // Invalid mastery model
      noMasteryModel() {
        return (
          this.isExercise &&
          (!this.node.extra_fields.mastery_model ||
            (this.node.extra_fields.mastery_model === MasteryModelsNames.M_OF_N &&
              (!this.node.extra_fields.m || !this.node.extra_fields.n)))
        );
      },
      // Exercise has no questions
      noQuestions() {
        return this.isExercise && !this.node.assessment_items.length;
      },
      // Exercise question is invalid
      invalidExerciseQuestion() {
        return this.isExercise && this.node.invalid_exercise;
      },
      error() {
        if (
          this.noTitle ||
          this.noLicense ||
          this.noCopyrightHolder ||
          this.noLicenseDescription ||
          this.noFiles ||
          this.noMasteryModel ||
          this.noQuestions ||
          this.invalidExerciseQuestion
        ) {
          return this.$tr('incompleteText');
        }
        return '';
      },
    },
    $trs: {
      incompleteText: 'Incomplete',
      missingTitle: 'Missing title',
    },
  };

</script>
