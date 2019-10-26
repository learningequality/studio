<template>

  <VList>
    <!-- Select all checkbox -->
    <VListTile class="select-all-wrapper" @click="toggleSelectAll">
      <VListTileAction>
        <VCheckbox color="primary" :inputValue="selectAllChecked" @click.stop="toggleSelectAll" />
      </VListTileAction>
      <VListTileContent>
        <VListTileTitle>{{ $tr('selectAllLabel') }}</VListTileTitle>
      </VListTileContent>
    </VListTile>
    <VDivider />

    <!-- Selected items -->
    <EditListItem
      v-for="(node, index) in nodes"
      :key="node.id"
      :index="index"
      :removable="allowAddTopic || allowAddExercise"
    />

    <!-- Create button -->
    <VListTile v-if="allowAddTopic || allowAddExercise" class="add-item-wrapper">
      <VListTileContent>
        <VBtn
          block
          depressed
          color="primary"
          dark
          @click="$emit('addNode')"
        >
          {{ addButtonText }}
        </VBtn>
      </VListTileContent>
    </VListTile>
  </VList>

</template>

<script>

  import { mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import EditListItem from './EditListItem.vue';

  export default {
    name: 'EditList',
    components: {
      EditListItem,
    },
    data() {
      return {
        selectAllChecked: false,
      };
    },
    computed: {
      ...mapState('edit_modal', ['nodes', 'mode']),
      allowAddTopic() {
        return this.mode === modes.NEW_TOPIC;
      },
      allowAddExercise() {
        return this.mode === modes.NEW_EXERCISE;
      },
      addButtonText() {
        if (this.allowAddTopic) return this.$tr('addTopic');
        else if (this.allowAddExercise) return this.$tr('addExercise');
        return null;
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        selectAll: 'SELECT_ALL_NODES',
        deselectAll: 'RESET_SELECTED',
      }),
      toggleSelectAll() {
        this.selectAllChecked ? this.deselectAll() : this.selectAll();
        this.selectAllChecked = !this.selectAllChecked;
      },
    },
    $trs: {
      selectAllLabel: 'Select All',
      addTopic: 'Add Topic',
      addExercise: 'Add Exercise',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .v-divider {
    margin-top: 0;
  }

  .add-item-wrapper {
    padding-bottom: 50px;
    margin-top: 20px;
  }

</style>
