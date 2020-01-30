<template>

  <div>
    <VDialog
      ref="editmodal"
      v-model="dialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
      lazy
    >
      <VCard class="edit-modal-wrapper">
        <VToolbar
          dark
          color="primary"
          fixed
          clipped-left
          app
          flat
        >
          <VBtn data-test="close" icon dark app @click="handleClose">
            <Icon>
              close
            </Icon>
          </VBtn>
          <VToolbarTitle>{{ mode && $tr(mode) }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VFlex v-if="!isViewOnly" align-center class="last-saved-time">
              <div v-if="saveError">
                {{ $tr('saveFailedText') }}
              </div>
              <div v-else-if="saving">
                <VProgressCircular indeterminate size="15" width="2" color="white" />
                {{ $tr('savingIndicator') }}
              </div>
            </VFlex>
            <VBtn v-if="!isViewOnly" data-test="save" dark flat @click="handleSave">
              {{ $tr('saveButtonText') }}
            </VBtn>
            <VBtn
              v-else
              ref="copybutton"
              data-test="copy"
              dark
              flat
              @click="copyContent"
            >
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
                  allowMultiple
                  @uploading="createNodesFromFiles"
                >
                  <template #default="{openFileDialog}">
                    <VBtn
                      v-if="allowUpload"
                      depressed
                      dark
                      color="primary"
                      @click="openFileDialog"
                    >
                      {{ $tr('uploadButton') }}
                    </VBtn>
                  </template>
                </Uploader>
              </VFlex>
              <VSpacer />
              <VFlex v-if="allowUpload" class="text-xs-right">
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
          <EditList
            :allowRemove="newContentMode"
            @addNode="createNode"
            @uploadStarted="uploadStarted"
          />
        </ResizableNavigationDrawer>
        <VCardText>
          <EditView :isClipboard="isClipboard" />
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialog for catching unsaved changes -->
    <Dialog
      ref="saveprompt"
      :header="$tr('invalidNodesFound', {count: invalidNodes().length})"
      :text="$tr('invalidNodesFoundText')"
    >
      <template slot="buttons" slot-scope="messagedialog">
        <VBtn flat data-test="saveanyways" color="primary" @click="handleForceSave">
          {{ $tr('saveAnywaysButton') }}
        </VBtn>
        <VSpacer />
        <VBtn depressed color="primary" @click="messagedialog.close">
          {{ $tr('keepEditingButton') }}
        </VBtn>
      </template>
    </Dialog>

    <!-- Dialog for catching in-progress file uploads -->
    <Dialog
      ref="uploadsprompt"
      :header="$tr('uploadInProgressHeader')"
      :text="$tr('uploadInProgressText')"
    >
      <template slot="buttons" slot-scope="messagedialog">
        <VBtn flat data-test="canceluploads" color="primary" @click="handleForceSave">
          {{ $tr('cancelUploadsButton') }}
        </VBtn>
        <VSpacer />
        <VBtn depressed color="primary" @click="messagedialog.close">
          {{ $tr('keepEditingButton') }}
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
    <Dialog
      ref="savefailedalert"
      :header="$tr('saveFailedHeader')"
      :text="$tr('saveFailedText')"
    >
      <template slot="buttons" slot-scope="messagedialog">
        <VBtn flat color="primary" @click="closeModal">
          {{ $tr('closeWithoutSavingButton') }}
        </VBtn>
        <VSpacer />
        <VBtn depressed color="primary" @click="messagedialog.close">
          {{ $tr('okButton') }}
        </VBtn>
      </template>
    </Dialog>
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

  const SAVE_TIMER = 2000;

  export default {
    name: 'EditModal',
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
        saving: false,
        saveError: false,
      };
    },
    computed: {
      ...mapState('edit_modal', ['nodes', 'changes', 'mode']),
      ...mapGetters('edit_modal', ['changed', 'invalidNodes', 'totalFileSize', 'filesUploading']),
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
      debouncedSave() {
        return _.debounce(this.saveContent, SAVE_TIMER);
      },
    },
    watch: {
      changes: {
        deep: true,
        handler() {
          if (this.changed) this.debouncedSave();
        },
      },
      dialog(val) {
        this.hideHTMLScroll(!!val);
      },
    },
    mounted() {
      this.hideHTMLScroll(true);
    },
    methods: {
      ...mapActions('edit_modal', ['saveNodes', 'copyNodes', 'prepareForSave']),
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        reset: 'RESET_STATE',
        setNode: 'SET_NODE',
        addNodeToList: 'ADD_NODE',
        createNodesFromFiles: 'ADD_NODES_FROM_FILES',
      }),
      /*
       * @public
       */
      openModal() {
        this.dialog = true;
        if (this.nodes.length > 0) this.$nextTick(() => this.select(0));
        if (this.mode === modes.NEW_TOPIC || this.mode === modes.NEW_EXERCISE) {
          this.createNode();
        }
      },
      closeModal() {
        this.dialog = false;
        this.$refs.uploadsprompt.close();
        this.$refs.saveprompt.close();
        this.$refs.savefailedalert.close();
        this.$emit('modalclosed');
        this.reset();
        // TODO: Update router
      },
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
      },

      /* Button actions */
      copyContent() {
        // Main action when modal is opened in view only mode
        if (_.some(this.nodes, n => n.prerequisite.length || n.is_prerequisite_of.length)) {
          this.$refs.relatedalert.prompt();
        }
        this.copyNodes().then(() => {
          this.closeModal();
        });
      },
      handleClose() {
        // X button action
        if (this.isViewOnly) {
          this.closeModal();
        } else {
          this.handleSave();
        }
      },
      handleSave() {
        // Main action when modal is opened in edit mode
        // Prepare for save sets all as not new and
        // activates validation on all nodes
        this.prepareForSave();
        let invalidNodes = this.invalidNodes();

        // Check if there are any files uploading
        if (this.filesUploading) {
          this.$refs.uploadsprompt.prompt();
        }

        // Check if there are any invalid nodes
        else if (invalidNodes.length) {
          this.setNode(invalidNodes[0]);
          this.$refs.saveprompt.prompt();
        } else if (this.changed) {
          this.handleForceSave();
        } else {
          this.closeModal();
        }
      },
      handleForceSave() {
        // Save anyways button action
        this.saveContent()
          .then(this.closeModal)
          .catch(() => {
            this.saveError = true;
            this.$refs.savefailedalert.prompt();
          });
      },
      saveContent() {
        this.saveError = false;
        return new Promise((resolve, reject) => {
          this.saving = true;
          this.saveNodes()
            .then(() => {
              this.saving = false;
              resolve();
            })
            .catch(error => {
              this.saveError = true;
              reject(error);
            });
        });
      },

      /* Creation actions */
      createNode() {
        this.prepareForSave();
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
        this.prepareForSave();
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
    },

    $trs: {
      [modes.EDIT]: 'Editing Content Details',
      [modes.VIEW_ONLY]: 'Viewing Content Details',
      [modes.NEW_TOPIC]: 'Adding Topics',
      [modes.NEW_EXERCISE]: 'Adding Exercises',
      [modes.UPLOAD]: 'Uploading Files',
      saveButtonText: 'Finish',
      copyButtonText:
        '{count, plural,\n =1 {Copy to clipboard}\n other {Copy # items to clipboard}} ({size})',
      savingIndicator: 'Saving...',
      invalidNodesFound: '{count} errors found',
      invalidNodesFoundText:
        "You won't be able to publish your channel until these errors are resolved",
      saveAnywaysButton: 'Save anyway',
      keepEditingButton: 'Keep editing',
      relatedContentHeader: 'Related content detected',
      relatedContentText: 'Related content will not be included in the copy of this content.',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      topicDefaultTitle: '{parent} Topic',
      exerciseDefaultTitle: '{parent} Exercise',
      addTopic: 'Add Topic',
      addExercise: 'Add Exercise',
      uploadButton: 'Upload More',
      uploadInProgressHeader: 'Upload in progress',
      uploadInProgressText:
        'Files that have not finished uploading will be removed if you finish now',
      cancelUploadsButton: 'Cancel uploads',
      closeWithoutSavingButton: 'Close without saving',
      okButton: 'OK',
    },
  };

</script>

<style lang="less">

  @import '../../../../less/global-variables.less';

  .edit-modal-wrapper {
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

    // there is a conflicting style for .row class in common styles
    // that sets left and right margin to -15px which breaks Vuetify
    // elements using Vuetify's .row class
    .row {
      margin-right: 0;
      margin-left: 0;
    }
  }

</style>
