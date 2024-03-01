<template>

  <EditBooleanMapModal
    field="grade_levels"
    isDescendantsUpdatable
    :title="$tr('editLevelsTitle')"
    :nodeIds="nodeIds"
    :inputComponent="LevelsOptionsComponent"
    :confirmationMessage="$tr('editedLevels', { count: nodeIds.length })"
    @close="close"
  />

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import EditBooleanMapModal from './EditBooleanMapModal';
  import { ContentLevels } from 'shared/constants';
  import { metadataTranslationMixin } from 'shared/mixins';
  import LevelsOptions from 'shared/views/contentNodeFields/LevelsOptions';

  export default {
    name: 'EditLevelsModal',
    components: {
      EditBooleanMapModal,
      LevelsOptions,
    },
    mixins: [metadataTranslationMixin],
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    computed: {
      levelsOptions() {
        const replaceTranslationMap = {
          PROFESSIONAL: 'specializedProfessionalTraining',
          WORK_SKILLS: 'allLevelsWorkSkills',
          BASIC_SKILLS: 'allLevelsBasicSkills',
        };
        return Object.entries(ContentLevels).map(([key, value]) => ({
          label: this.translateMetadataString(replaceTranslationMap[key] || camelCase(key)),
          value,
        }));
      },
      LevelsOptionsComponent() {
        return LevelsOptions;
      },
    },
    methods: {
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      editLevelsTitle: 'What Levels',
      editedLevels:
        'Edited levels for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style scoped>
</style>
