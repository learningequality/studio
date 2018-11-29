<template>

  <div>
    <!-- SLOT FOR CHANNEL SET VIEW OR CHANNEL SELECT VIEW-->
    <div>
      <slot />
    </div>

    <br/>

    <div class="modal-bottom-content-default">
      <a class="action-text uppercase" data-dismiss="modal">
        {{ $tr('cancelButtonLabel') }}
      </a>
      <button
        class="action-button pull-right modal-main-action-button uppercase"
        @click="handleSave"
        :disabled="!enableSave"
      >
        {{ $tr('saveButtonLabel') }}
      </button>
    </div>
  </div>

</template>


<script>

import { mapGetters, mapState, mapActions, mapMutations } from 'vuex';
import { PageTypes } from '../constants';

export default {
  name: 'ChannelSetDialog',
  $trs: {
    cancelButtonLabel: 'Cancel',
    saveButtonLabel: 'Save',
  },
  computed: Object.assign(
    // mapState('channel_set', [
    //   'itemsToImport',
    // ]),
    mapGetters('channel_set', [
      'changed',
      'title',
      'description',
    ]),
    {
      enableSave() {
        return this.changed //&& this.title.length !== 0;
      }
    }
  ),
  methods: Object.assign(
  //   mapMutations('import', {
  //     updateImportStatus: 'UPDATE_IMPORT_STATUS',
  //   }),
  //   mapActions('import', [
  //     'goToSearchResults',
  //     'goToImportPreview',
  //   ]),
    {
      handleSave() {
        console.log("HANDLING SAVE")
        // if (this.currentImportPage === PageTypes.SEARCH_RESULTS || this.currentImportPage === PageTypes.TREE_VIEW) {
        //   return this.goToImportPreview();
        // }
        // if (this.currentImportPage === PageTypes.IMPORT_PREVIEW) {
        //   // Check to see if imports have related content
        //   if (hasRelatedContent(this.itemsToImport)) {
        //     return this.updateImportStatus('show_warning');
        //   } else {
        //     // Triggers import action from ImportModal BB View
        //     return this.updateImportStatus('import_confirmed');
        //   }
        // }
      }
    }
  ),
}

</script>

<style lang="less" scoped>

@import "../../../../less/modal-styles.less";
@import "../../../../less/global-variables.less";

button.action-button[disabled] {
  opacity: 0.75;
}

</style>
