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
        <span class="visuallyhidden">Select '{{ node.title }}'</span>
      </Checkbox>
    </template>
    <template #title="{ titleText }">
      <KTextTruncator
        :text="titleText"
        :maxLines="2"
        class="custom-title"
      />
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
          :text="node.original_channel_name"
          :maxLines="2"
        />
      </div>
    </template>
    <template #footer>
      <KFixedGrid :numCols="2">
        <KFixedGridItem alignment="right">
          <KIconButton icon="openNewTab" />
          <KIconButton icon="thumbDown" />
        </KFixedGridItem>
      </KFixedGrid>
    </template>
  </KCard>

</template>


<script>

  import find from 'lodash/find';
  import LearningActivities from 'kolibri-constants/labels/LearningActivities';
  import { ContentKindLearningActivityDefaults } from 'shared/leUtils/ContentKinds';
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
      selected: {
        type: Array,
        required: true,
      },
    },
    computed: {
      learningActivities() {
        return {
          [ContentKindLearningActivityDefaults[this.node.kind] || LearningActivities.EXPLORE]: true,
        };
      },
      isSelected() {
        return function(node) {
          return Boolean(find(this.selected, { id: node.id }));
        };
      },
    },
    methods: {
      toggleSelected(node) {
        this.$emit('change_selected', { nodes: [node], isSelected: !this.isSelected(node) });
      },
      onClick() {
        this.$emit('preview', this.node);
      },
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
  .custom-title {
    font-weight: bold;
    line-height: 1.5; /* Temporary fix for the title text truncation */
  }
</style>
