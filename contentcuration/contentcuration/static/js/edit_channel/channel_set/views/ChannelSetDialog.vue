<template>

  <div>
    <!-- SLOT FOR CHANNEL SET VIEW OR CHANNEL SELECT VIEW-->
    <div id="channel-set-content">
      <slot/>
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
        :title="saveButtonTitle"
      >
        {{ $tr('saveButtonLabel') }}
      </button>
      <span
        class="spinner material-icons pull-right"
        v-show="saving"
      >
        autorenew
      </span>
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
    noChangesTitle: "No changes detected",
    invalidCollection: "Must enter all required fields",
    saving: "Saving..."
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'changed',
      'name',
      'description',
      'isValid',
      'saving'
    ]),
    {
      enableSave() {
        return this.changed && this.isValid && !this.saving;
      },
      saveButtonTitle() {
        if (this.saving) {
          return this.$tr('saving');
        } else if(!this.isValid) {
          return this.$tr('invalidCollection');
        } else if (!this.changed) {
          return this.$tr('noChangesTitle');
        } else
        return this.$tr('saveButtonLabel');
      }
    }
  ),
  methods: Object.assign(
    mapMutations('channel_set', {
      prepareForSave: 'PREPARE_CHANNEL_SET_FOR_SAVE',
    }),
    mapActions('channel_set', ['goToViewChannels', 'saveChannelSet']),
    {
      handleSave() {
        if (this.name.length === 0) {
          return this.goToViewChannels();
        } else {
          this.prepareForSave();
          return this.saveChannelSet();
        }
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
@keyframes spin {
  from { transform: scale(1) rotate(0deg);}
  to { transform: scale(1) rotate(360deg);}
}
.spinner {
  animation: spin 1.5s infinite linear;
  font-size: 20pt;
  vertical-align: middle;
  margin-right: 15px;
  color: @blue-500;
}

/deep/ .channel-list {
  margin-bottom: 20px;
}

/deep/ .channelCountText {
  font-size: 13pt;
  margin-bottom: 15px;
}

</style>
