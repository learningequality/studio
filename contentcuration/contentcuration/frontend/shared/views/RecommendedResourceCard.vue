<template>

  <KCard
    :title="node.title"
    :headingLevel="2"
    thumbnailScaleType="contain"
    thumbnailDisplay="small"
    thumbnailAlign="right"
    :thumbnailSrc="node.thumbnail_src"
    @click="onClick"
  >
    <template #select>
      <Checkbox
        :key="`checkbox-${node.id}`"
        :inputValue="isSelected(node)"
        @input="toggleSelected(node)"
      >
        <span class="visuallyhidden">{{ $tr('selectCard', { title: node.title }) }}</span>
      </Checkbox>
    </template>
    <template #aboveTitle>
      <ContentNodeLearningActivityIcon
        :learningActivities="learningActivities"
        showEachActivityIcon
        includeText
        small
      />
    </template>
    <template #belowTitle>
      <div>
        <KTextTruncator
          :text="node.channel_name"
          :maxLines="2"
        />
      </div>
    </template>
    <template #footer>
      <KFixedGrid :numCols="2">
        <KFixedGridItem alignment="right">
          <KIconButton
            icon="openNewTab"
            :tooltip="$tr('goToLocationTooltip')"
            @click.stop="goToLocation"
          />
          <KIconButton
            icon="thumbDown"
            :tooltip="$tr('markNotRelevantTooltip')"
            @click.stop="markNotRelevant"
          />
        </KFixedGridItem>
      </KFixedGrid>
    </template>
  </KCard>

</template>


<script>

  import find from 'lodash/find';
  import LearningActivities from 'kolibri-constants/labels/LearningActivities';
  import { mapState } from 'vuex';
  import {
    ContentKindLearningActivityDefaults,
    ContentKindsNames,
  } from 'shared/leUtils/ContentKinds';
  import Checkbox from 'shared/views/form/Checkbox';
  import ContentNodeLearningActivityIcon from 'shared/views/ContentNodeLearningActivityIcon';

  export default {
    name: 'RecommendedResourceCard',
    components: {
      Checkbox,
      ContentNodeLearningActivityIcon,
    },
    props: {
      node: {
        type: Object,
        required: true,
      },
    },
    computed: {
      ...mapState('importFromChannels', ['selected']),
      learningActivities() {
        if (this.node.learning_activities && Object.keys(this.node.learning_activities).length) {
          return this.node.learning_activities;
        }
        return {
          [ContentKindLearningActivityDefaults[this.node.kind] || LearningActivities.EXPLORE]: true,
        };
      },
      isSelected() {
        return function (node) {
          return Boolean(find(this.selected, { id: node.id }));
        };
      },
      goToLocationUrl() {
        const baseUrl = window.Urls.channel(this.node.channel_id);
        if (this.isTopic) {
          return `${baseUrl}#/${this.node.id}`;
        }
        return `${baseUrl}#/${this.node.parent}/${this.node.id}`;
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
    },
    methods: {
      toggleSelected(node) {
        this.$emit('change_selected', { nodes: [node], isSelected: !this.isSelected(node) });
      },
      onClick() {
        this.$emit('preview', this.node);
      },
      goToLocation() {
        window.open(this.goToLocationUrl, '_blank');
      },
      markNotRelevant() {
        this.$emit('irrelevant', this.node);
      },
    },
    $trs: {
      selectCard: 'Select { title }',
      goToLocationTooltip: 'Go to location',
      markNotRelevantTooltip: 'Mark as not relevant',
    },
  };

</script>


<style>

  .visuallyhidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    border: 0;
  }

</style>
