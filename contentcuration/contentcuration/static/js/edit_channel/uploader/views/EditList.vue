<template>
  <Uploader :readonly="!allowUpload">
    <template v-slot:upload-zone>
      <VList>
        <!-- Select all checkbox -->
        <VListTile class="select-all-wrapper" @click="toggleSelectAll">
          <VListTileAction>
            <VCheckbox
              color="primary"
              :inputValue="selectAllChecked"
              @click.stop="toggleSelectAll"
            />
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
          :removable="allowAddTopic || allowAddExercise || allowUpload"
        />

        <!-- Create button -->
        <VListTile v-if="allowAddTopic || allowAddExercise" class="add-item-wrapper">
          <VListTileContent>
            <VBtn
              block
              depressed
              color="primary"
              dark
              textTruncate
              @click="$emit('addNode')"
            >
              {{ addButtonText }}
            </VBtn>
          </VListTileContent>
        </VListTile>
      </VList>
    </template>
    <template v-if="allowUpload" slot="upload-actions" slot-scope="uploader">
      <VListTile>
        <VListTileContent>
          <VBtn block depressed dark color="primary" @click="uploader.openDialog">
            {{ $tr('uploadButton') }}
          </VBtn>
        </VListTileContent>
      </VListTile>
      <p class="drop-prompt">
        {{ $tr('dropFilesText') }}
      </p>
    </template>
  </Uploader>
</template>

<script>

  import { mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import EditListItem from './EditListItem.vue';
  import Uploader from 'edit_channel/sharedComponents/Uploader.vue';

  export default {
    name: 'EditList',
    $trs: {
      selectAllLabel: 'Select All',
      addTopic: 'Add Topic',
      addExercise: 'Add Exercise',
      uploadButton: 'Upload',
      dropFilesText: 'or drop files here',
    },
    components: {
      EditListItem,
      Uploader,
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
      allowUpload() {
        return this.mode === modes.UPLOAD;
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
    &.upload-item {
      padding-bottom: 5px;
    }
  }

  .drop-prompt {
    margin-bottom: 50px;
    font-weight: bold;
    color: @gray-500;
    text-align: center;
    pointer-events: none;
    cursor: default;
  }

</style>
