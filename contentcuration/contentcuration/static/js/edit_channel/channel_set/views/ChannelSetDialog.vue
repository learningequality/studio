<template>
  <div>
    <!-- SLOT FOR CHANNEL SET VIEW OR CHANNEL SELECT VIEW-->
    <div id="channel-set-content">
      <slot></slot>
    </div>

    <br>

    <div class="modal-bottom-content-default">
      <a class="action-text uppercase" data-dismiss="modal">
        {{ $tr('cancelButtonLabel') }}
      </a>
      <button
        class="action-button pull-right modal-main-action-button uppercase"
        :disabled="!enableSave"
        :title="saveButtonTitle"
        @click="handleSaveClose"
      >
        {{ $tr('saveCloseButtonLabel') }}
      </button>
      <button
        class="action-text pull-right modal-main-action-button uppercase"
        :disabled="!enableSave"
        :title="saveButtonTitle"
        @click="handleSave"
      >
        {{ $tr('saveButtonLabel') }}
      </button>
      <span
        v-show="saving"
        class="spinner pull-right"
      >
      </span>
      <span v-show="error" class="red-text error-text pull-right">
        {{ $tr('errorText') }}
      </span>
    </div>
  </div>
</template>


<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';

  export default {
    name: 'ChannelSetDialog',
    $trs: {
      cancelButtonLabel: 'Close',
      saveButtonLabel: 'Save',
      saveCloseButtonLabel: 'Save & Close',
      noChangesTitle: 'No changes detected',
      invalidCollection: 'Must enter all required fields',
      saving: 'Saving...',
      errorText: 'There was a problem saving your collection',
    },
    computed: Object.assign(
      mapGetters('channel_set', ['changed', 'name', 'description', 'isValid', 'saving']),
      mapState('channel_set', ['error']),
      {
        enableSave() {
          return this.changed && this.isValid && !this.saving;
        },
        saveButtonTitle() {
          if (this.saving) {
            return this.$tr('saving');
          } else if (!this.isValid) {
            return this.$tr('invalidCollection');
          } else if (!this.changed) {
            return this.$tr('noChangesTitle');
          } else return this.$tr('saveButtonLabel');
        },
      }
    ),
    methods: Object.assign(
      mapMutations('channel_set', {
        setSaving: 'SET_SAVING',
        setClosing: 'SET_CLOSING',
      }),
      {
        handleSave() {
          this.setSaving(true);
        },
        handleSaveClose() {
          this.setClosing(true);
          this.setSaving(true);
        },
      }
    ),
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/modal-styles.less';
  @import '../../../../less/global-variables.less';

  button.action-button[disabled] {
    opacity: 0.75;
  }
  @keyframes spin {
    from {
      transform: scale(1) rotate(0deg);
    }
    to {
      transform: scale(1) rotate(360deg);
    }
  }
  .spinner {
    margin-right: 15px;
    font-size: 20pt;
    color: @blue-500;
    vertical-align: middle;
    animation: spin 1.5s infinite linear;
  }

  /deep/ .channel-list {
    margin-bottom: 20px;
  }

  /deep/ .channel-count-text {
    margin-bottom: 15px;
    font-size: 13pt;
  }

  .error-text {
    margin-right: 10px;
  }

  /deep/ .red-text {
    font-weight: bold;
    color: @red-error-color;
  }

</style>
