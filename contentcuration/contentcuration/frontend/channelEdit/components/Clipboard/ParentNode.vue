<template>

  <VListGroup
    v-model="open"
    append-icon="arrow_drop_down"
    class="parent-item"
    lazy
    sub-group
  >
    <template v-slot:activator>
      <ContentNode
        :nodeId="nodeId"
        :sourceId="sourceId"
      >
        <VListTileContent class="description-col py-2 pl-2 shrink">
          <VBadge color="primary">
            <template #badge>
              <span class="caption font-weight-bold">{{ descendantCount }}</span>
            </template>
            <VListTileTitle class="text-truncate">
              {{ contentNode.title }}
            </VListTileTitle>
          </VBadge>
        </VListTileContent>

        <!-- Custom placement of dropdown indicator -->
        <VListTileAction
          class="v-list__group__header__append-icon action-col px-1"
        >
          <Icon>arrow_drop_down</Icon>
        </VListTileAction>
        <VSpacer />
      </ContentNode>
    </template>

    <transition-group>
      <template v-for="child in treeChildren">
        <ParentNode
          v-if="hasChildren(child.id)"
          :key="child.id"
          :nodeId="child.id"
          :sourceId="child.source_id"
        />
        <ContentNode
          v-else
          :key="child.id"
          :nodeId="child.id"
          :sourceId="child.source_id"
        />
      </template>
    </transition-group>

  </VListGroup>

</template>
<script>

  import ContentNode from './ContentNode';
  import clipboardMixin, { parentMixin } from './mixins';

  export default {
    name: 'ParentNode',
    components: {
      ContentNode,
    },
    mixins: [clipboardMixin, parentMixin],
    props: {
      sourceId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        open: false,
      };
    },
  };

</script>
<style lang="less" scoped>

  .parent-item,
  .v-list__tile {
    width: 100%;
    max-width: 100%;
  }

  /deep/ .v-list__group__header .v-list__group__header__prepend-icon {
    display: none;
  }

  .description-col {
    padding-right: 32px;
  }

  /deep/ .v-badge__badge {
    top: -1px;
    right: -32px;
    border-radius: 3px;
  }

</style>
