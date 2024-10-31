<template>

  <KCard
    :to="to"
    :title="node.title"
    layout="horizontal"
    :headingLevel="2"
    thumbnailScaleType="contain"
    thumbnailDisplay="small"
    thumbnailAlign="right"
    :thumbnailSrc="node.thumbnail"
  >
    <template #select>
      <Checkbox
        :key="`checkbox-${node.id}`"
        :inputValue="isSelected(node)"
        @input="toggleSelected(node)"
      />
    </template>
    <template #aboveTitle>
      <span>
        <ContentNodeLearningActivityIcon
          :learningActivities="{ 'wA01urpi': true }"
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
          :text="node.description"
          :maxLines="2"
        />
      </div>
    </template>
    <template #footer>
      <div class="align-right-style">
        <KIconButton icon="openNewTab" class="card-icon-size" />
        <KIconButton icon="thumbDown" class="card-icon-size" />
      </div>
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
  .align-right-style{
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
  }
</style>
