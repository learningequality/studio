<template>
  <VList>
    <!-- Select all checkbox -->
    <VListTile @click="toggleSelectAll">
      <VListTileAction>
        <VCheckbox color="primary" :value="selectAllChecked" @click.stop="toggleSelectAll" />
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
    <VListTile class="add-item-wrapper" :disabled="!isValid">
      <VListTileContent>
        <VBtn
          v-if="allowAddTopic"
          block
          depressed
          color="primary"
          dark
          @click="createNode('topic')"
        >
          {{ $tr('addTopic') }}
        </VBtn>
        <VBtn
          v-else-if="allowAddExercise"
          block
          depressed
          color="primary"
          dark
          @click="createNode('exercise')"
        >
          {{ $tr('addExercise') }}
        </VBtn>
      </VListTileContent>
    </VListTile>
  </VList>
</template>

<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import EditListItem from './EditListItem.vue';

  export default {
    name: 'EditList',
    $trs: {
      selectAllLabel: 'Select All',
      addTopic: 'Add Topic',
      addExercise: 'Add Exercise',
      topicDefaultTitle: '{parent} Topic',
      exerciseDefaultTitle: '{parent} Exercise',
    },
    components: {
      EditListItem,
    },
    props: {
      mode: {
        type: String,
        default: modes.VIEW_ONLY,
      },
    },
    data() {
      return {
        selectAllChecked: false,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['isValid']),
      ...mapState('edit_modal', ['nodes', 'targetNode']),
      allowAddTopic() {
        return this.mode === modes.NEW_TOPIC;
      },
      allowAddExercise() {
        return this.mode === modes.NEW_EXERCISE;
      },
    },
    mounted() {
      /*
        Leaving this commented as we might not want to automatically
        create nodes with autosaving
      */
      // if(this.mode === modes.NEW_TOPIC) {
      //   this.createNode('topic');
      // } else if (this.mode === modes.NEW_EXERCISE) {
      //   this.createNode('exercise');
      // }
    },
    methods: {
      ...mapMutations('edit_modal', {
        selectAll: 'SELECT_ALL_NODES',
        deselectAll: 'RESET_SELECTED',
        addNode: 'ADD_NODE',
      }),
      toggleSelectAll() {
        this.selectAllChecked ? this.deselectAll() : this.selectAll();
        this.selectAllChecked = !this.selectAllChecked;
      },
      createNode(kind) {
        let payload = {
          title: this.$tr(kind + 'DefaultTitle', { parent: this.targetNode.parent_title }),
          kind: kind,
        };
        this.addNode(payload);
      },
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
