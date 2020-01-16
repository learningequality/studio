<template>

  <VList>
    <!-- Select all checkbox -->
    <VCheckbox v-model="selectAll" color="primary">
      <template #label>
        <VListTile class="select-all-wrapper">
          <VListTileContent>
            <VListTileTitle>{{ $tr('selectAllLabel') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
      </template>
    </VCheckbox>
    <VDivider />

    <VCheckbox
      v-for="nodeId in nodeIds"
      :key="nodeId"
      v-model="selected"
      :class="{selected: isSelected}"
      color="primary"
      :value="nodeId"
    >
      <template #label>
        <VListTile>
          <VListTileAction />
          <VListTileAction v-if="node.changesStaged" class="changed">
            *
          </VListTileAction>
          <VListTileAvatar>
            <ContentNodeIcon :kind="node.kind" />
          </VListTileAvatar>
          <VListTileContent>
            <VListTileTitle>
              {{ node.title }}
            </VListTileTitle>
          </VListTileContent>
          <VSpacer />
          <VListTileAction v-if="!nodeIsValid">
            <VIcon color="red" class="error-icon">
              error
            </VIcon>
          </VListTileAction>
          <VListTileAction v-if="canEdit">
            <VBtn icon small flat class="remove-item" @click.stop="removeNode(index)">
              <VIcon>clear</VIcon>
            </VBtn>
          </VListTileAction>
        </VListTile>
      </template>
    </VCheckbox>

  </VList>

</template>

<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'EditList',
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      selected: {
        get() {
          return this.value;
        },
        set(items) {
          this.$emit('input', items);
        },
      },
      selectAll: {
        get() {
          return this.nodeIds.every(nodeId => this.selected.includes(nodeId));
        },
        set(value) {
          if (value) {
            this.selected = this.nodeIds;
          } else {
            this.selected = [];
          }
        },
      },
    },
    $trs: {
      selectAllLabel: 'Select All',
    },
  };

</script>

<style lang="less" scoped>

  .v-divider {
    margin-top: 0;
  }

  .add-item-wrapper {
    padding-bottom: 50px;
    margin-top: 20px;
  }

  .selected {
    background-color: #eeeeee;
  }

</style>
