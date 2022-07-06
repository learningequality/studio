<template>

  <span v-if="includeText">
    <span v-for="activity in activities" :key="activity">
      <div v-if="chip" :class="small ? 'small-chip' : 'chip'">
        <KLabeledIcon :icon="icon(activity)" :label="text(activity)" />
      </div>
      <div v-else>
        <KLabeledIcon :icon="icon(activity)" :label="text(activity)" />
      </div>
    </span>
  </span>
  <span v-else>
    <span v-if="showEachActivityChip">
      <KIcon
        v-for="activity in activities"
        :key="activity"
        :icon="icon(activity)"
        :aria-label="text(activity)"
      />
    </span>
    <span v-else-if="activities.length > 1 && !showEachActivityChip">
      <KIcon :icon="icon('multiple')" :aria-label="text('multiple')" />
    </span>
    <span v-else>
      <KIcon :icon="icon(activities[0])" :aria-label="text(activities[0])" />
    </span>
  </span>

</template>

<script>

  import { camelCase } from 'lodash';
  import { LearningActivities } from '../constants';
  import { getLearningActivityIcon } from 'shared/vuetify/icons';
  import { metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ContentNodeLearningActivityIcon',
    mixins: [metadataTranslationMixin],

    props: {
      learningActivity: {
        type: Object,
        required: false,
      },
      showEachActivityChip: {
        type: Boolean,
        default: false,
      },
      isTopic: {
        type: Boolean,
        default: false,
      },
      includeText: {
        type: Boolean,
        default: false,
      },
      chip: {
        type: Boolean,
        default: false,
      },
      small: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      activities() {
        if (this.learningActivity) {
          const ids = Object.keys(this.learningActivity);
          return Object.keys(LearningActivities).filter(k => ids.includes(LearningActivities[k]));
        }
      },
    },
    methods: {
      icon(activity) {
        if (this.isTopic) {
          return 'topic';
        } else {
          console.log(activity);
          return getLearningActivityIcon(this.text(activity));
        }
      },
      text(activity) {
        if (this.isTopic) {
          return this.$tr('topic');
        } else if (activity == 'multiple') {
          return this.$tr('multipleLearningActivities');
        }
        return this.translateMetadataString(camelCase(activity));
      },
    },
    $trs: {
      multipleLearningActivities: 'Multiple learning activities',
      topic: 'Folder',
    },
  };

</script>

<style lang="less" scoped>

  .chip {
    display: inline-block;
    width: unset !important;
    padding: 10px;
    margin: 4px;
    font-weight: bold;
    background-color: #dedede;
    border-radius: 4px;
  }

  .small-chip {
    display: inline-block;
    padding: 2px 4px;
    margin: 2px;
    font-size: 10px;
    background-color: #dedede;
    border-radius: 4px;
  }

</style>
