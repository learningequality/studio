<template>

  <KCard
    :to="to"
    :title="node.title"
    :headingLevel="2"
    thumbnailScaleType="contain"
    thumbnailDisplay="small"
    thumbnailAlign="right"
    :thumbnailSrc="node.thumbnail_src"
  >
    <template #select>
      <Checkbox
        :key="`checkbox-${node.id}`"
        :inputValue="isSelected(node)"
        @input="toggleSelected(node)"
      >
        <span class="visually-hidden">Select '{{ node.title }}'</span>
      </Checkbox>
    </template>
    <template #aboveTitle>
      <span>
        <ContentNodeLearningActivityIcon
          :learningActivities="node.learning_activities"
          showEachActivityIcon
          includeText
          small
          class="inline"
        />
      </span>
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
      <KFixedGrid :numCols="1">
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
  import Checkbox from 'shared/views/form/Checkbox';
  import ContentNodeLearningActivityIcon from 'shared/views/ContentNodeLearningActivityIcon';

  export default {
    name: 'RecommendedResourceCard',
    components: {
      Checkbox,
      ContentNodeLearningActivityIcon,
    },
    props: {
      to: {
        type: Object,
        required: true,
      },
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
    },
  };

</script>


<style>
  .visually-hidden{
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    border: 0;
    padding: 0;

    white-space: nowrap;
    clip-path: inset(100%);
    clip: rect(0 0 0 0);
    overflow: hidden;

    outline: 0;
    outline-offset: 0;
  }
</style>
