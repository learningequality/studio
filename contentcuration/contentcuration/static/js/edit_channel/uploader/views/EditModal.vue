<template>
  <div>
    <VDialog v-model="dialog" fullscreen hideOverlay transition="dialog-bottom-transition" lazy>
      <VCard class="edit-modal-wrapper">
        <VNavigationDrawer v-model="drawer.open" stateless clipped app class="edit-list">
          <EditList :mode="mode" />
        </VNavigationDrawer>
        <VToolbar dark color="primary" fixed clippedLeft app>
          <VBtn icon dark app @click="handleClose">
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

    <!-- Dialog for catching unsaved changes -->
    <Dialog ref="saveprompt" :header="$tr('unsavedChanges')" :text="$tr('unsavedChangesText')">
      <template v-slot:buttons>
        <VBtn flat color="primary" @click="closeModal">
          {{ $tr('dontSaveButton') }}
        </VBtn>
        <VSpacer />
        <VBtn flat color="primary" @click="dismissPrompt">
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn depressed color="primary" @click="saveContent">
          {{ $tr('saveButton') }}
        </VBtn>
      </template>
    </Dialog>

    <!-- Alert for related content -->
    <Alert
      ref="relatedalert"
      :header="$tr('relatedContentHeader')"
      :text="$tr('relatedContentText')"
      messageID="relatedContentAlertOnCopyFromEditModal"
    />
  </div>
</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';
  import Dialog from 'edit_channel/sharedComponents/Dialog.vue';
  import Alert from 'edit_channel/sharedComponents/Alert.vue';

  const SAVE_TIMER = 5000;
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
      unsavedChanges: 'Save your changes?',
      unsavedChangesText: "Your changes will be lost if you don't save them",
      dontSaveButton: "Don't save",
      cancelButton: 'Cancel',
      saveButton: 'Save changes',
      relatedContentHeader: 'Related content detected',
      relatedContentText: 'Related content will not be included in the copy of this content.',

      // invalid_items: 'One or more of the selected items is invalid',
      // fix_errors_prompt: 'Saving disabled (invalid content detected)',
      // error_saving: 'Save Failed',
      // save_failed: 'There was a problem saving your content.',
      // out_of_space: 'Out of Disk Space',
      // out_of_space_text:
      //   "Please request more space under your Settings page.",
      // open_settings: 'Open Settings',
      // ok: 'OK'
    },
    components: {
      EditList,
      EditView,
      Dialog,
      Alert,
    },
    props: {
      mode: {
        type: String,
        default: modes.VIEW_ONLY,
      },
    },
    data() {
      return {
        dialog: false,
        lastSaved: null,
        saving: false,
        savedMessage: null,
        interval: null,
        updateInterval: null,
        saveFunction: this.debouncedSave(),
        drawer: {
          open: true,
        },
      };
    },
    computed: {
      ...mapState('edit_modal', ['nodes', 'changes']),
      ...mapGetters('edit_modal', ['changed']),
      isViewOnly() {
        return this.mode === modes.VIEW_ONLY;
      },
      lastSavedTime() {
        return this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
      showEditList() {
        return this.mode !== modes.EDIT || this.nodes.length > 1;
      },
    },
    watch: {
      dialog(val) {
        // Temporary workaround while waiting for Vuetify bug
        // to be fixed https://github.com/vuetifyjs/vuetify/issues/5617
        if (val) {
          setTimeout(() => (this.drawer.open = this.showEditList), 300);
        }
      },
      changes: {
        deep: true,
        handler() {
          this.changed && this.saveFunction();
        },
      },
    },
    beforeMount() {
      this.drawer.open = this.showEditList;
    },
    mounted() {
      this.openModal();
    },
    methods: {
      ...mapActions('edit_modal', ['saveNodes']),
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        deselectAll: 'RESET_SELECTED',
      }),
      openModal() {
        this.dialog = true;
        if (this.nodes.length > 0) this.select(0);
      },
      updateSavedTime() {
        this.savedMessage = this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
      saveContent() {
        this.saving = true;
        this.saveNodes().then(() => {
          clearInterval(this.updateInterval);
          this.saving = false;
          this.lastSaved = null;
          this.closeModal();
        });
      },
      debouncedSave() {
        return _.debounce(() => {
          clearInterval(this.updateInterval);
          this.saving = true;
          this.saveNodes().then(() => {
            this.lastSaved = Date.now();
            this.saving = false;
            this.updateSavedTime();
            this.updateInterval = setInterval(this.updateSavedTime, SAVE_MESSAGE_TIMER);
          });
        }, SAVE_TIMER);
      },
      handleClose() {
        if (this.changed) {
          this.$refs.saveprompt.prompt();
        } else {
          this.closeModal();
        }
      },
      dismissPrompt() {
        this.$refs.saveprompt.close();
      },
      closeModal() {
        this.dismissPrompt();
        this.dialog = false;
        this.deselectAll();
        this.$emit('modalclosed');
        // TODO: Update router
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
