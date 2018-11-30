<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default" id="channel_set_modal_content">
        <div class="modal-header">
          <h4 class="modal-title">{{ modalTitle }}</h4>
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

import { mapGetters, mapActions } from 'vuex';
import { PageTypes } from '../constants';
import ChannelSetDialog from './ChannelSetDialog.vue';
import ChannelSetList from './ChannelSetList.vue';
import ChannelSelectView from './ChannelSelectView.vue';

const pageNameToComponentMap = {
  [PageTypes.SELECT_CHANNELS]: 'ChannelSelectView',
  [PageTypes.VIEW_CHANNELS]: 'ChannelSetList',
};

export default {
  name: 'ChannelSetModal',
  $trs: {
    newSetHeader: 'New Collection',
    editingSetHeader: 'Editing Collection',
  },
  components: {
    ChannelSetDialog,
    ChannelSetList,
    ChannelSelectView,
  },
  mounted() {
    this.openModal();
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'isNewSet',
      'currentPage'
    ]),
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
  methods: Object.assign(
    {
      openModal() {
        $(this.$refs.topmodal)
          .modal({ show: true })
          .on('hidden.bs.modal', () => {
            // Event to tell BB View to cleanup
            this.$emit('modalclosed');
          });
      },
      closeModal() {
        $(this.$refs.topmodal).modal('hide');
      },
    }
  ),
}

</script>


<style lang="less" scoped>
  #channel_set_modal_content {
    background-color: white;
    width: 750px;
  }
  .modal-title {
    font-weight: bold;
  }
</style>
