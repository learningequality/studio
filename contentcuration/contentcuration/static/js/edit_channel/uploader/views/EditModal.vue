<template>
  <div>
    <VDialog
      ref="editmodal"
      v-model="dialog"
      fullscreen
      hideOverlay
      transition="dialog-bottom-transition"
      lazy
    >
      <VCard class="edit-modal-wrapper">
        <VToolbar
          dark
          color="primary"
          fixed
          clippedLeft
          app
          flat
        >
          <VBtn ref="closebutton" icon dark app @click="handleClose">
            <VIcon>close</VIcon>
          </VBtn>
          <VToolbarTitle>{{ mode && $tr(mode) }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VFlex v-if="!isViewOnly" alignCenter class="last-saved-time">
              <div v-if="saveError">
                {{ $tr('saveFailedText') }}
              </div>
              <div v-else-if="invalidNodes.length">
                {{ $tr('autosaveDisabledMessage', {count: invalidNodes.length}) }}
              </div>
              <div v-else-if="saving">
                <VProgressCircular indeterminate size="15" width="2" color="white" />
                {{ $tr('savingIndicator') }}
              </div>
              <div v-else-if="lastSaved">
                {{ savedMessage }}
              </div>
            </VFlex>
            <VBtn v-if="!isViewOnly" ref="savebutton" dark flat @click="handleSave">
              {{ $tr('saveButtonText') }}
            </VBtn>
            <VBtn v-else ref="copybutton" dark flat @click="copyContent">
              {{ $tr('copyButtonText', {
                count: nodes.length, size: formatFileSize(totalFileSize)}) }}
            </VBtn>
          </VToolbarItems>
          <template v-if="newContentMode && nodes.length" v-slot:extension>
            <VToolbar light color="white" flat>
              <!-- Create button -->
              <VBtn
                v-if="allowAddTopic || allowAddExercise"
                depressed
                color="primary"
                dark
                textTruncate
                @click="createNode"
              >
                {{ addButtonText }}
              </VBtn>

              <!-- Upload button -->
              <VFlex xs6 lg8>
                <Uploader
                  :readonly="!allowUpload"
                  :allowDrop="false"
                  @uploading="createNodesFromFiles"
                >
                  <template slot="upload-zone" slot-scope="uploader">
                    <VBtn
                      v-if="allowUpload"
                      depressed
                      dark
                      color="primary"
                      @click="uploader.openFileDialog"
                    >
                      {{ $tr('uploadButton') }}
                    </VBtn>
                  </template>
                </Uploader>
              </VFlex>
              <VSpacer />
              <VFlex v-if="allowUpload" class="text-right">
                <FileStorage />
              </VFlex>
            </VToolbar>
          </template>
        </VToolbar>
        <ResizableNavigationDrawer
          v-if="showEditList"
          stateless
          clipped
          app
          class="edit-list"
          :open="showEditList"
          :minWidth="150"
        >
          <template v-slot:content>
            <EditList
              :allowRemove="newContentMode"
              @addNode="createNode"
              @uploadStarted="uploadStarted"
            />
          </template>
        </ResizableNavigationDrawer>
        <VCardText>
          <EditView :isClipboard="isClipboard" />
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialog for catching unsaved changes -->
    <Dialog ref="saveprompt" :header="$tr('unsavedChanges')" :text="$tr('unsavedChangesText')">
      <template v-slot:buttons>
        <VBtn ref="savepromptdontsave" flat color="primary" @click="closeModal">
          {{ $tr('dontSaveButton') }}
        </VBtn>
        <VSpacer />
        <VBtn ref="savepromptcancel" flat color="primary" @click="dismissPrompt">
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn ref="savepromptsave" depressed color="primary" @click="handleSave">
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

    <!-- Alert for failed save -->
    <Alert
      ref="savefailedalert"
      :header="$tr('saveFailedHeader')"
      :text="$tr('saveFailedText')"
    />
  </div>
</template>

<script>

  import _ from 'underscore';
  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';
  import State from 'edit_channel/state';
  import Dialog from 'edit_channel/sharedComponents/Dialog.vue';
  import Alert from 'edit_channel/sharedComponents/Alert.vue';
  import ResizableNavigationDrawer from 'edit_channel/sharedComponents/ResizableNavigationDrawer.vue';
  import Uploader from 'edit_channel/sharedComponents/Uploader.vue';
  import FileStorage from 'edit_channel/file_upload/views/FileStorage.vue';
  import { fileSizeMixin } from 'edit_channel/file_upload/mixins';

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
      copyButtonText:
        '{count, plural,\n =1 {Copy to clipboard}\n other {Copy # items to clipboard}} ({size})',
      savedMessage: 'Saved {relativeTime}',
      savingIndicator: 'Saving...',
      unsavedChanges: 'Save your changes?',
      unsavedChangesText: "Your changes will be lost if you don't save them",
      dontSaveButton: "Don't save",
      cancelButton: 'Cancel',
      saveButton: 'Save changes',
      relatedContentHeader: 'Related content detected',
      relatedContentText: 'Related content will not be included in the copy of this content.',
      invalidItemsDetected: 'Saving disabled (invalid content detected)',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      autosaveDisabledMessage:
        'Autosave paused ({count, plural,\n =1 {# error}\n other {# errors}} detected)',
      topicDefaultTitle: '{parent} Topic',
      exerciseDefaultTitle: '{parent} Exercise',
      addTopic: 'Add Topic',
      addExercise: 'Add Exercise',
      uploadButton: 'Upload More',
      dropFilesText: 'or drop files here',
    },
    components: {
      EditList,
      EditView,
      Dialog,
      Alert,
      ResizableNavigationDrawer,
      Uploader,
      FileStorage,
    },
    mixins: [fileSizeMixin],
    props: {
      isClipboard: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        dialog: false,
        lastSaved: null,
        saving: false,
        savedMessage: null,
        saveError: false,
        interval: null,
        updateInterval: null,
        debouncedSave: _.debounce(() => {
          if (!this.invalidNodesOverridden.length) {
            this.saveContent()
              .then(() => {
                this.updateSavedTime();
                this.updateInterval = setInterval(this.updateSavedTime, SAVE_MESSAGE_TIMER);
              })
              .catch(() => (this.saveError = true));
          }
        }, SAVE_TIMER),
      };
    },
    computed: {
      ...mapState('edit_modal', ['nodes', 'changes', 'mode', 'files']),
      ...mapGetters('edit_modal', [
        'changed',
        'invalidNodes',
        'invalidNodesOverridden',
        'fileIDs',
        'totalFileSize',
      ]),
      isViewOnly() {
        return this.mode === modes.VIEW_ONLY;
      },
      showEditList() {
        // Only hide drawer when editing a single item
        return Boolean(this.newContentMode && this.nodes.length) || this.nodes.length > 1;
      },
      allowAddTopic() {
        return this.mode === modes.NEW_TOPIC;
      },
      allowAddExercise() {
        return this.mode === modes.NEW_EXERCISE;
      },
      addButtonText() {
        if (this.allowAddTopic) return this.$tr('addTopic');
        else if (this.allowAddExercise) return this.$tr('addExercise');
        return null;
      },
      allowUpload() {
        return this.mode === modes.UPLOAD;
      },
      newContentMode() {
        return this.allowUpload || this.allowAddExercise || this.allowAddTopic;
      },
    },
    watch: {
      changes: {
        deep: true,
        handler() {
          if (this.changed) this.debouncedSave();
          else this.debouncedSave.cancel();
        },
      },
    },
    methods: {
      ...mapActions('edit_modal', ['saveNodes', 'copyNodes']),
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        deselectAll: 'RESET_SELECTED',
        reset: 'RESET_STATE',
        prepareForSave: 'PREP_NODES_FOR_SAVE',
        setNode: 'SET_NODE',
        addNodeToList: 'ADD_NODE',
        createNodesFromFiles: 'ADD_NODES_FROM_FILES',
      }),
      openModal() {
        this.dialog = true;
        if (this.nodes.length > 0) this.$nextTick(() => this.select(0));
        if (this.mode === modes.NEW_TOPIC || this.mode === modes.NEW_EXERCISE) {
          this.createNode();
        }
      },
      createNode() {
        let titleArgs = { parent: State.currentNode.title };
        if (this.mode === modes.NEW_TOPIC) {
          this.addNodeToList({
            title: this.$tr('topicDefaultTitle', titleArgs),
            kind: 'topic',
          });
        } else if (this.mode === modes.NEW_EXERCISE) {
          this.addNodeToList({
            title: this.$tr('exerciseDefaultTitle', titleArgs),
            kind: 'exercise',
          });
        }
      },
      uploadStarted(data) {
        this.addNodeToList({
          title: data.name,
          kind: data.kind,
          files: [
            {
              ...data,
            },
          ],
        });
      },
      updateSavedTime() {
        this.savedMessage = this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
      saveContent() {
        this.saveError = false;
        return new Promise((resolve, reject) => {
          clearInterval(this.updateInterval);
          if (this.invalidNodesOverridden.length) {
            resolve();
          } else {
            this.saving = true;
            this.saveNodes()
              .then(() => {
                this.lastSaved = Date.now();
                this.saving = false;
                resolve();
              })
              .catch(reject);
          }
        });
      },
      handleSave() {
        // Prepare for save sets all as not new and
        // activates validation on all nodes
        this.prepareForSave();
        if (this.invalidNodes.length) {
          this.setNode(this.invalidNodes[0]);
        } else {
          this.saveContent()
            .then(this.closeModal)
            .catch(() => {
              this.$refs.savefailedalert.prompt();
              this.dismissPrompt();
            });
        }
      },
      handleClose() {
        this.debouncedSave.cancel();
        if (this.changed) {
          this.$refs.saveprompt.prompt();
        } else {
          this.closeModal();
        }
      },
      dismissPrompt() {
        this.$refs.saveprompt.close();
        this.debouncedSave();
      },
      closeModal() {
        this.debouncedSave.cancel();
        this.dismissPrompt();
        this.dialog = false;
        this.lastSaved = null;
        this.savedMessage = '';
        this.reset();
        this.$emit('modalclosed');
        // TODO: Update router
      },
      copyContent() {
        if (_.some(this.nodes, n => n.prerequisite.length || n.is_prerequisite_of.length)) {
          this.$refs.relatedalert.prompt();
        }
        this.copyNodes().then(() => {
          this.closeModal();
        });
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
    .edit-list {
      width: 100%;
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
    .v-toolbar__extension {
      padding: 0;
      .v-toolbar__content {
        border-bottom: 1px solid @gray-300;
      }
    }
  }

</style>
