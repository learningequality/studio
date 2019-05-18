<template>
  <VNavigationDrawer v-model="drawer.open" stateless clipped app class="edit-list">
    <VList>
      <!-- Select all checkbox -->
      <VListTile :disabled="!isValid" @click="toggleSelectAll">
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
  </VNavigationDrawer>
</template>

<script>

  import { mapMutations, mapState } from 'vuex';
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
        selectAllChecked: true,
        drawer: {
          open: true,
        },
      };
    },
    computed: {
      ...mapState('edit_modal', ['isValid', 'nodes', 'targetNode']),
      allowAddTopic() {
        return this.mode === modes.NEW_TOPIC;
      },
      allowAddExercise() {
        return this.mode === modes.NEW_EXERCISE;
      },
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
      openDrawer() {
        // TODO: auto select all on load
        this.drawer.open = true;
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

  .v-divider {
    margin-top: 0;
  }

  .add-item-wrapper {
    padding-bottom: 50px;
    margin-top: 20px;
  }

</style>
