<template>
  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div id="channel-set-modal-content" class="modal-content modal-dialog-default">
        <div class="modal-header">
          <h4 class="modal-title">
            {{ modalTitle }}
          </h4>
        </div>
        <div class="modal-body">
          <ChannelSetDialog>
            <component :is="pageType" />
          </ChannelSetDialog>
        </div>
      </div>
    </div>
  </div>
</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import { PageTypes } from '../constants';
  import ChannelSetDialog from './ChannelSetDialog.vue';
  import ChannelSelectView from './ChannelSelectView.vue';
  import ChannelSetList from './ChannelSetList.vue';

  const pageNameToComponentMap = {
    [PageTypes.SELECT_CHANNELS]: ChannelSelectView,
    [PageTypes.VIEW_CHANNELS]: ChannelSetList,
  };

  export default {
    name: 'ChannelSetModal',
    $trs: {
      newSetHeader: 'New Collection',
      editingSetHeader: 'Editing Collection',
    },
    components: {
      ChannelSetDialog,
    },
    computed: Object.assign(
      mapGetters('channel_set', ['currentPage']),
      mapState('channel_set', ['isNewSet']),
      {
        pageType() {
          return pageNameToComponentMap[this.currentPage];
        },
        modalTitle() {
          if (this.isNewSet) {
            return this.$tr('newSetHeader');
          }
          return this.$tr('editingSetHeader');
        },
      }
    ),
    mounted() {
      this.openModal();
    },
    methods: {
      openModal() {
        $(this.$refs.topmodal)
          .modal({ show: true })
          .on('hide.bs.modal', event => {
            // Check for changes
            this.$emit('modalclosing', event);
          })
          .on('hidden.bs.modal', () => {
            // Event to tell BB View to cleanup
            this.$emit('modalclosed');
          });
      },
      closeModal() {
        $(this.$refs.topmodal).modal('hide');
      },
    },
  };

</script>


<style lang="less" scoped>

  .modal-dialog {
    width: 750px;
  }
  #channel-set-modal-content {
    background-color: white;
  }
  .modal-title {
    font-weight: bold;
  }

</style>
