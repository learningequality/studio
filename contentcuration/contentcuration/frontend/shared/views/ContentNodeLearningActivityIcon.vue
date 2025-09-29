<template>

  <span v-if="includeText">
    <!-- if include text is true, use a labeled icon.
    Currently, for icons containing text, each activity
     is displayed inidividually if there are multiple -->
    <span
      v-for="(activity, index) in activities"
      :key="index"
      data-test="labeled-icon"
    >
      <div
        v-if="chip"
        :class="small ? 'small-chip' : 'chip'"
        :style="{ backgroundColor: $themeTokens.fineLine }"
      >
        <KLabeledIcon
          :icon="icon(activity)"
          :label="text(activity)"
          :style="iconStyle"
        />
      </div>
      <div v-else>
        <KLabeledIcon
          :icon="icon(activity)"
          :label="text(activity)"
          :style="iconStyle"
        />
      </div>
    </span>
  </span>
  <!-- If not text, just use a KIcon -->
  <span v-else>
    <!-- if multiple learning activities should be displayed with a single icon -->
    <span v-if="activities.length > 1 && !showEachActivityIcon">
      <KIcon
        :icon="icon('multiple')"
        :aria-label="text('multiple')"
        data-test="multiple-activities-icon"
        :style="iconStyle"
      />
    </span>
    <!--otherwise, display one or more activities individually, each with its own icon -->
    <span v-else-if="activities.length > 0">
      <KIcon
        v-for="activity in activities"
        :key="activity"
        data-test="icon-only"
        :icon="icon(activity)"
        :aria-label="text(activity)"
        :style="iconStyle"
      />
    </span>
  </span>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { LearningActivities } from '../constants';
  import { getLearningActivityIcon } from 'shared/vuetify/icons';
  import { metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ContentNodeLearningActivityIcon',
    mixins: [metadataTranslationMixin],

    props: {
      learningActivities: {
        type: Object,
        required: false,
        default: () => ({}),
      },
      showEachActivityIcon: {
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
      iconStyle: {
        type: Object,
        default: () => ({}),
      },
    },
    computed: {
      activities() {
        if (this.learningActivities) {
          const ids = Object.keys(this.learningActivities);
          return Object.keys(LearningActivities).filter(k => ids.includes(LearningActivities[k]));
        }
        return [];
      },
    },
    methods: {
      icon(activity) {
        return getLearningActivityIcon(activity);
      },
      text(activity) {
        if (activity === 'multiple') {
          return this.$tr('multipleLearningActivities');
        }
        return this.translateMetadataString(camelCase(activity));
      },
    },
    $trs: {
      multipleLearningActivities: 'Multiple learning activities',
    },
  };

</script>


<style lang="scss" scoped>

  .chip {
    display: inline-block;
    width: unset !important;
    padding: 10px;
    margin: 4px;
    font-weight: bold;
    border-radius: 4px;
  }

  .small-chip {
    display: inline-block;
    padding: 2px 4px;
    margin: 2px;
    font-size: 10px;
    border-radius: 4px;
  }

</style>
