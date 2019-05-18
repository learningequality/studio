<template>
  <div class="edit-modal-wrapper">
    <VBtn @click.stop="openModal">
      Open Edit Modal
    </VBtn>
    <VDialog v-model="dialog" fullscreen hideOverlay transition="dialog-bottom-transition" lazy>
      <VCard>
        <EditList ref="editlist" :mode="mode" />
        <VToolbar dark color="primary" fixed clippedLeft app>
          <VBtn icon dark app @click="closeModal">
            <VIcon>close</VIcon>
          </VBtn>
          <VToolbarTitle>{{ $tr(mode) }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VFlex alignCenter class="last-saved-time">
              <div v-if="saving">
                <VProgressCircular
                  indeterminate
                  size="15"
                  width="2"
                  color="white"
                />
                {{ $tr('savingIndicator') }}
              </div>
              <div v-else-if="lastSaved">
                {{ savedMessage }}
              </div>
            </VFlex>
            <VBtn v-if="!isViewOnly" dark flat @click="saveContent">
              {{ $tr('saveButtonText') }}
            </VBtn>
            <VBtn v-else dark flat @click="copyContent">
              {{ $tr('copyButtonText') }}
            </VBtn>
          </VToolbarItems>
        </VToolbar>

        <EditView :mode="mode" />
      </VCard>
    </VDialog>
  </div>
</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';

  const SAVE_TIMER = 35000;
  const SAVE_MESSAGE_TIMER = 10000;

  export default {
    name: 'EditModal',
    $trs: {
      [modes.EDIT]: 'Editing Content Details',
      [modes.VIEW_ONLY]: 'Viewing Content Details',
      [modes.NEW_TOPIC]: 'Adding Topics',
      [modes.NEW_EXERCISE]: 'Adding Exercises',
      [modes.UPLOAD]: 'Uploading Files',
      saveButtonText: 'Save & Close',
      copyButtonText: 'Copy',
      savedMessage: 'Saved {relativeTime}',
      savedNowMessage: 'Saved just now',
      savingIndicator: 'Saving...',
    },
    components: {
      EditList,
      EditView,
    },
    props: {
      mode: {
        type: String,
        default: modes.EDIT,
      },
    },
    data() {
      return {
        dialog: true,
        lastSaved: null,
        saving: false,
        savedMessage: null,
        interval: null,
        updateInterval: null,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['changed']),
      isViewOnly() {
        return this.mode === modes.VIEW_ONLY;
      },
      lastSavedTime() {
        return this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
    },
    watch: {
      dialog(val) {
        // Temporary workaround while waiting for Vuetify bug
        // to be fixed https://github.com/vuetifyjs/vuetify/issues/5617
        if (val) {
          setTimeout(this.$refs.editlist.openDrawer, 300);
        }
      },
    },
    mounted() {
      this.openModal();
    },
    methods: {
      ...mapActions('edit_modal', ['saveNodes']),
      openModal() {
        this.dialog = true;
        this.interval = setInterval(() => {
          if (this.changed) {
            clearInterval(this.updateInterval);
            this.saving = true;
            this.saveNodes().then(() => {
              this.lastSaved = Date.now();
              this.saving = false;
              this.updateSavedTime();
              this.updateInterval = setInterval(this.updateSavedTime, SAVE_MESSAGE_TIMER);
            });
          }
        }, SAVE_TIMER);
      },
      updateSavedTime() {
        this.savedMessage = this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
      saveContent() {
        this.saving = true;
        this.saveNodes().then(() => {
          this.closeModal();
        });
      },
      closeModal() {
        clearInterval(this.interval);
        clearInterval(this.updateInterval);
        this.saving = false;
        this.lastSaved = null;
        this.dialog = false;
        this.$emit('modalclosed');
      },
      copyContent() {
        this.closeModal();
      },
    },
  };

</script>

<style lang="less">

  @import '../../../../less/global-variables.less';

  .edit-modal-wrapper {
    * {
      font-family: @font-family;
      &.v-icon {
        .material-icons;
      }
    }
    a {
      .linked-list-item;
    }

    .last-saved-time {
      padding-top: 20px;
      margin-right: 15px;
      font-style: italic;
      .v-progress-circular {
        margin-right: 10px;
        vertical-align: text-top;
      }
    }
  }

</style>
