<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default" id="import_modal_content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title">{{ $tr('importHeader') }}</h4>
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

const { mapGetters, mapActions } = require('vuex');

module.exports = {
  name: 'ImportModal',
  $trs: {
    'importHeader': "Import from Other Channels"
  },
  components: {
    ImportDialogue: require('./ImportDialogue.vue'),
    ImportChannelList: require('./ImportChannelList.vue'),
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
      pageType: function() {
        const pageType = this.currentImportPage;
        if (pageType === 'tree_view') {
          return 'ImportChannelList';
        } else if (pageType === 'search_results') {
          return 'SearchResults'
        }
      }
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
