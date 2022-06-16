<template>

  <!-- <span v-if="icon">
    <VChip v-if="showColor" label color="#efefef" :small="small" :textColor="fontColor" class="ma-0 pa-0"
      :class="{ iconOnly: !includeText, fillWidth }" :style="{ width: fillWidth ? '100%' : 'unset' }" capture-as-image>
      <KIcon small color="white" :icon="icon" />
      <span v-if="includeText" class="ml-2">"hello world"</span>
    </VChip>
    <span v-else capture-as-image>
      <KIcon small color="white" :icon="icon" />
      <span v-if="includeText">"hello world"</span>
    </span>
  </span> -->
  <div v-if="includeText && chip" class="chip">
    <KLabeledIcon :icon="icon" :label="text" />
  </div>
  <div v-else-if="includeText && !chip">
    <KLabeledIcon :icon="icon" :label="text" />
  </div>
  <KIcon v-else :icon="icon" :aria-label="text" />


</template>

<script>

import { getContentKindIcon } from 'shared/vuetify/icons';
import { LearningActivities } from '../../shared/constants';
import { camelCase } from 'lodash';
import {  metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ContentNodeIcon',
    mixins: [metadataTranslationMixin],

    props: {
      learningActivity: {
        type: Object,
        required: false,
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
    },
    computed: {
      icon() {
        if (this.isTopic) {
          return 'topic'
        } else {
          return getContentKindIcon(this.text);
        }
      },
      text() {
        if (this.isTopic) {
          return this.$tr('topic')
        }
        return this.learningActivityString(this.learningActivity)
      }
    },
    methods: {
      matchIdToString(ids) {
        return ids.map(i => this.translateMetadataString(camelCase(i))).join(', ');
      },
      learningActivityString(options) {
        const ids = Object.keys(options);
        const matches = Object.keys(LearningActivities).filter(k =>
          ids.includes(LearningActivities[k])
        );
        if (matches && matches.length === 1) {
          return this.matchIdToString(matches);
        } else if (matches && matches.length > 1) {
          return this.$tr('multipleLearningActivities')
        } else {
          return '';
        }
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
      background-color: #dedede;
      display: inline-block;
        padding: 10px;
        font-weight: bold;
        border-radius: 4px;
        width: unset !important;
  }

</style>
