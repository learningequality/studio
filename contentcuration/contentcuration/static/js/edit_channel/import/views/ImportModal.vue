<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default" id="import_modal_content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title">{{ modalTitle }}</h4>
        </div>
        <div class="modal-body">
          <ImportDialogue>
            <component :is="pageType" />
          </ImportDialogue>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

import { mapGetters, mapActions } from 'vuex';

const pageNameToComponentMap = {
  import_preview: 'ImportPreview',
  search_results: 'SearchResults',
  tree_view: 'ImportChannelList',
};

module.exports = {
  name: 'ImportModal',
  $trs: {
    importHeader: 'Import from Other Channels',
    importPreviewHeader: 'Review selections for import',
  },
  components: {
    ImportChannelList: require('./ImportChannelList.vue'),
    ImportDialogue: require('./ImportDialogue.vue'),
    ImportPreview: require('./ImportPreview.vue'),
    SearchResults: require('./SearchResults.vue'),
  },
  mounted() {
    this.openModal();
    this.loadChannels();
  },
  computed: Object.assign(
    mapGetters({
      currentImportPage: 'import/currentImportPage',
      channels: 'import/channels',
    }),
    {
      pageType() {
        return pageNameToComponentMap[this.currentImportPage];
      },
      modalTitle() {
        if (this.currentImportPage === 'import_preview') {
          return this.$tr('importPreviewHeader');
        }
        return this.$tr('importHeader');
      },
    }
  ),
  methods: Object.assign(
    mapActions('import', ['loadChannels']),
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

</style>
