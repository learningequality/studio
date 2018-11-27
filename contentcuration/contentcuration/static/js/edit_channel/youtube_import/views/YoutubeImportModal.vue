<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default" id="youtube_import_modal_content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title">{{ $tr('importHeader') }}</h4>
        </div>
        <div class="modal-body">
          <YoutubeDialogue>
            <component :is="pageType" />
          </YoutubeDialogue>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

import { mapGetters, mapActions } from 'vuex';
import { PageTypes } from '../constants';
import YoutubeDialogue from './YoutubeDialogue.vue';
import YoutubeSubmitUrl from './YoutubeSubmitUrl.vue';
import YoutubeConfirm from './YoutubeConfirm.vue';

const pageNameToComponentMap = {
  [PageTypes.SUBMIT_URL]: 'YoutubeSubmitUrl',
  [PageTypes.CONFIRM]: 'YoutubeConfirm',
};

export default {
  name: 'YoutubeImportModal',
  $trs: {
    'importHeader': 'Import from YouTube',
  },
  components: {
    YoutubeConfirm,
    YoutubeDialogue,
    YoutubeSubmitUrl,
  },
  mounted() {
    this.openModal();
  },
  computed: Object.assign(
    mapGetters({
      currentPage: 'youtube_import/currentPage',
    }),
    {
      pageType() {
        return pageNameToComponentMap[this.currentPage];
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
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
    }
  ),
}

</script>


<style lang="less" scoped>
  #youtube_import_modal_content {
    width: 600px;
  }
</style>
