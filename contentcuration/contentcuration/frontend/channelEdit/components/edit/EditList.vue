<template>

  <VList two-line>
    <!-- Select all checkbox -->
    <Checkbox
      v-model="selectAll"
      class="mb-2 ml-1 mt-0 px-3 py-2"
      :label="$tr('selectAllLabel')"
    />
    <EditListItem
      v-for="nodeId in nodeIds"
      :key="nodeId"
      v-model="selected"
      :nodeId="nodeId"
      @input="trackSelect"
      @removed="handleRemoved"
    />

  </VList>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';
  import EditListItem from './EditListItem';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'EditList',
    components: {
      EditListItem,
      Checkbox,
    },
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
    watch: {
      // watch the selected contentnode
      value(newValue) {
        const CONTENTNODEID = newValue[0];
        if (this.isAIFeatureEnabled && newValue.length === 1) { // Only one node is selected to edit
          const KIND = this.getContentNode(CONTENTNODEID).kind;
          
          // we make a request only when the kind is video or audio
          if(KIND === 'video' || KIND === 'audio') {
            // load the caption file of the contentnode and its cues
            this.loadCaptionFiles({ contentnode_id: CONTENTNODEID }).then(captionFile => {
              let captionFileID = captionFile[0].id; // FK to retrieve the cues of a caption file
              this.loadCaptionCues({ caption_file_id: captionFileID })
            })
          }
        }
      }
    },
    computed: {
      ...mapGetters('currentChannel', ['isAIFeatureEnabled']),
      ...mapGetters('contentNode', ['getContentNode']),
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
            this.$analytics.trackAction('channel_editor_modal', 'Select all');
          } else {
            this.selected = [];
          }
        },
      },
    },
    methods: {
      ...mapActions('caption', ['loadCaptionFiles', 'loadCaptionCues']),
      handleRemoved(nodeId) {
        const nodeIds = this.$route.params.detailNodeIds.split(',').filter(id => id !== nodeId);

        this.$router.push({
          name: this.$route.name,
          params: {
            nodeId: this.$route.params.nodeId,
            detailNodeIds: nodeIds.join(','),
          },
        });
        if (this.selected.includes(nodeId)) {
          if (this.selected.length === 1) {
            const viableNodes = this.nodeIds.filter(id => id !== nodeId);
            this.selected = [viableNodes[viableNodes.length - 1]];
          } else {
            this.selected = this.selected.filter(id => id !== nodeId);
          }
        }
      },
      trackSelect() {
        this.$analytics.trackAction('channel_editor_modal', 'Select', {
          eventLabel: 'List item',
        });
      },
    },
    $trs: {
      selectAllLabel: 'Select all',
    },
  };

</script>

<style lang="less" scoped>

  .v-divider {
    margin-top: 0;
  }

</style>
