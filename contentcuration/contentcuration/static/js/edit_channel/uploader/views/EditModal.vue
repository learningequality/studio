<template>

  <div>
    <VDialog
      ref="editmodal"
      :value="$route.params.detailNodeId == detailNodeId"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
      lazy
      scrollable
    >
      <VCard class="edit-modal-wrapper">
        <VToolbar
          dark
          color="primary"
          fixed
          flat
          clipped-left
          app
        >
          <VBtn data-test="close" icon dark app @click="handleClose">
            <Icon>close</Icon>
          </VBtn>
          <VToolbarTitle>{{ modalTitle }}</VToolbarTitle>
          <VSpacer />
          <VBtn v-if="canEdit" data-test="save" dark flat @click="handleSave">
            {{ $tr('saveButtonText') }}
          </VBtn>
          <VBtn v-else data-test="copy" dark flat @click="copyContent">
            {{ $tr('copyButtonText', {
              count: nodes.length, size: formatFileSize(totalFileSize)}) }}
          </VBtn>
          <template v-if="canEdit" #extension>
            <VToolbar light color="white" flat>
              <VMenu style="z-index: 300;">
                <VBtn slot="activator" color="primary">
                  {{ $tr('addItemDropdown' ) }}
                </VBtn>
                <VList>
                  <VListTile @click="createNode('topic')">
                    <VListTileTitle>{{ $tr('addTopic') }}</VListTileTitle>
                  </VListTile>
                  <VListTile @click="createNode('exercise')">
                    <VListTileTitle>{{ $tr('addExercise') }}</VListTileTitle>
                  </VListTile>
                  <Uploader allowMultiple @uploading="createNodesFromFiles">
                    <template #default="{openFileDialog}">
                      <VListTile @click="openFileDialog">
                        <VListTileTitle>{{ $tr('uploadButton') }}</VListTileTitle>
                      </VListTile>
                    </template>
                  </Uploader>
                </VList>
              </VMenu>
              <VSpacer />
              <VFlex class="text-xs-right">
                <FileStorage />
              </VFlex>
            </VToolbar>
          </template>
        </VToolbar>
        <ResizableNavigationDrawer
          v-if="multipleNodes"
          stateless
          clipped
          app
          :open="drawerOpen"
          :minWidth="150"
        >
          <Uploader
            fill
            allowMultiple
            @uploading="createNodesFromFiles"
          >
            <EditList
              v-model="selected"
              :nodeIds="detailNodeIds"
            />
          </Uploader>
        </ResizableNavigationDrawer>
        <VCardText>
          <VContent>
            <VLayout v-if="loadError" align-center justify-center>
              <VFlex class="text-xs-center">
                <Icon color="red">
                  error
                </Icon>
                <p>{{ $tr('loadErrorText') }}</p>
              </VFlex>
            </VLayout>
            <VLayout v-else-if="loading" align-center justify-center>
              <VFlex class="text-xs-center">
                <VProgressCircular indeterminate color="grey" />
                <p class="title mt-4">
                  {{ $tr('loading') }}
                </p>
              </VFlex>
            </VLayout>
            <EditView v-else :nodeIds="selected" />
          </VContent>
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

  import { mapActions, mapGetters } from 'vuex';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';
  import Dialog from 'edit_channel/sharedComponents/Dialog.vue';
  import Alert from 'edit_channel/sharedComponents/Alert.vue';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Uploader from 'frontend/channelEdit/views/files/Uploader';
  import FileStorage from 'frontend/channelEdit/views/files/FileStorage';
  import { fileSizeMixin } from 'edit_channel/file_upload/mixins';
  import { RouterNames } from 'frontend/channelEdit/constants';

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
      detailNodeId: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        loading: false,
        loadError: false,
        selected: this.detailNodeIds,
        drawerOpen: this.multipleNodes,
      };
    },
    computed: {
      // ...mapGetters('contentNode', ['getContentNodeIsValid']),
      ...mapGetters('currentChannel', ['canEdit']),
      // ...mapGetters('edit_modal', ['changed',
      //'invalidNodes', 'totalFileSize', 'filesUploading']),
      isViewOnly() {
        return !this.canEdit;
      },
      // invalidNodeCount() {
      //   return this.detailNodeIds.reduce(
      //     (invalid, detailNodeId) => invalid + Number(!this.getContentNodeIsValid(detailNodeId)),
      //     0
      //   );
      // },
      multipleNodes() {
        // Only hide drawer when editing a single item
        return this.nodes.length > 1;
      },
      detailNodeIds() {
        if (this.detailNodeId) {
          return [this.detailNodeId];
        }
        return [];
      },
      // nodes() {
      //   return this.detailNodeIds.map(detailNodeId => this.getContentNode(detailNodeId));
      // },
      modalTitle() {
        return this.canEdit ? this.$tr('editingDetailsHeader') : this.$tr('viewingDetailsHeader');
      },
    },
    beforeRouteEnter(to, from, next) {
      if (to.name === RouterNames.CONTENTNODE_DETAILS) {
        return next(vm => {
          vm.loading = true;
          vm.loadContentNode(to.params.detailNodeId)
            .then(() => {
              vm.loading = false;
              vm.selected = [to.params.detailNodeId];
            })
            .catch(() => {
              vm.loading = false;
              vm.loadError = true;
            });
        });
      } else if (to.name === RouterNames.MULTI_CONTENTNODE_DETAILS) {
        return next(vm => {
          vm.loading = true;
          let nodeIds = to.params.detailNodeIds.split(',');
          vm.loadContentNode(nodeIds)
            .then(() => {
              vm.loading = false;
              vm.selected = [nodeIds[0]];
            })
            .catch(() => {
              vm.loading = false;
              vm.loadError = true;
            });
        });
      }
      return next(false);
    },
    mounted() {
      this.hideHTMLScroll(true);
    },
    methods: {
      // ...mapActions('edit_modal', ['saveNodes', 'copyNodes', 'prepareForSave']),
      ...mapActions('contentNode', ['loadContentNode', 'createContentNode']),
      closeModal() {
        this.$refs.uploadsprompt.close();
        this.$refs.saveprompt.close();
        this.$refs.savefailedalert.close();
        this.$emit('modalclosed');
        this.reset();
        this.hideHTMLScroll(false);
        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: { nodeId: this.$route.params.nodeId },
        });
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
      createNode(kind) {
        this.createContentNode({
          kind,
          parent: this.$route.params.nodeId,
        });
      },
      createNodesFromFiles(files) {
        files.forEach(file => {
          this.createContentNode({
            kind: file.kind,
            parent: this.$route.params.nodeId,
          });
        });
      },
      // uploadStarted(data) {
      //   this.prepareForSave();
      //   this.addNodeToList({
      //     title: data.name,
      //     kind: data.kind,
      //     files: [
      //       {
      //         ...data,
      //       },
      //     ],
      //   });
      // },
    },
    $trs: {
      editingDetailsHeader: 'Editing Content Details',
      viewingDetailsHeader: 'Viewing Content Details',
      saveButtonText: 'Finish',
      copyButtonText:
        '{count, plural,\n =1 {Copy to clipboard}\n other {Copy # items to clipboard}} ({size})',
      invalidNodesFound: '{count} errors found',
      invalidNodesFoundText:
        "You won't be able to publish your channel until these errors are resolved",
      saveAnywaysButton: 'Save anyway',
      keepEditingButton: 'Keep editing',
      relatedContentHeader: 'Related content detected',
      relatedContentText: 'Related content will not be included in the copy of this content.',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      // topicDefaultTitle: '{parent} Topic',
      // exerciseDefaultTitle: '{parent} Exercise',
      addItemDropdown: 'Add item',
      addTopic: 'Add Topic',
      addExercise: 'Add Exercise',
      uploadButton: 'Upload Files',
      uploadInProgressHeader: 'Upload in progress',
      uploadInProgressText:
        'Files that have not finished uploading will be removed if you finish now',
      cancelUploadsButton: 'Cancel uploads',
      closeWithoutSavingButton: 'Close without saving',
      okButton: 'OK',
      loading: 'Loading...',
      loadErrorText: 'Failed to load content',
    },
  };

</script>

<style lang="less" scoped>

  // .edit-modal-wrapper {
  //   .edit-list {
  //     width: 100%;
  //   }
  /deep/ .v-toolbar__extension {
    padding: 0;
    .v-toolbar__content {
      border-bottom: 1px solid var(--v-grey-lighten4);
    }
  }

  // there is a conflicting style for .row class in common styles
  // that sets left and right margin to -15px which breaks Vuetify
  // elements using Vuetify's .row class
  .row {
    margin-right: 0;
    margin-left: 0;
  }

</style>
