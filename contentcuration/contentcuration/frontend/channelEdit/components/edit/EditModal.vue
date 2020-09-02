<template>

  <div>
    <VDialog
      ref="editmodal"
      :value="true"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
      lazy
      scrollable
      persistent
    >
      <VCard class="edit-modal-wrapper">
        <Uploader allowMultiple displayOnly @uploading="createNodesFromUploads">
          <template #default="{openFileDialog, handleFiles}">
            <!-- Toolbar + extension -->
            <VToolbar
              dark
              color="primary"
              fixed
              flat
              clipped-left
              app
            >
              <VBtn data-test="close" icon dark @click="handleClose">
                <Icon>arrow_back</Icon>
              </VBtn>
              <VToolbarTitle>{{ modalTitle }}</VToolbarTitle>
              <VSpacer />
              <OfflineText indicator />
              <template v-if="showToolbar && !loading && !loadError" #extension>
                <VToolbar light color="white" flat>
                  <VBtn v-if="addTopicsMode" color="primary" @click="createTopic">
                    {{ $tr('addTopic') }}
                  </VBtn>
                  <VBtn v-else-if="uploadMode" color="primary" @click="openFileDialog">
                    {{ $tr('uploadButton') }}
                  </VBtn>
                  <VSpacer />
                  <VFlex v-if="showStorage" class="text-xs-right">
                    <FileStorage />
                  </VFlex>
                </VToolbar>
              </template>
            </VToolbar>

            <!-- List items -->
            <ResizableNavigationDrawer
              v-if="multipleNodes && !loading"
              localName="edit-modal"
              stateless
              clipped
              app
              :minWidth="150"
              :maxWidth="500"
            >
              <FileDropzone fill :disabled="!uploadMode" @dropped="handleFiles">
                <EditList
                  v-model="selected"
                  :nodeIds="nodeIds"
                  @input="enableValidation(nodeIds);"
                />
              </FileDropzone>
            </ResizableNavigationDrawer>

            <!-- Main editing area -->
            <VContent>
              <VLayout v-if="loadError" align-center justify-center fill-height>
                <VFlex class="text-xs-center">
                  <Icon color="red">
                    error
                  </Icon>
                  <p>{{ $tr('loadErrorText') }}</p>
                </VFlex>
              </VLayout>
              <LoadingText v-else-if="loading" />
              <FileUploadDefault
                v-else-if="uploadMode && !nodeIds.length"
                :parentTitle="parentTitle"
                :handleFiles="handleFiles"
                :openFileDialog="openFileDialog"
              />
              <EditView
                v-else
                :nodeIds="selected"
                :tab="tab"
              />
            </VContent>
          </template>
        </Uploader>
      </VCard>
    </VDialog>

    <!-- Dialog for catching unsaved changes -->
    <MessageDialog
      v-model="promptInvalid"
      :header="$tr('invalidNodesFound', {count: invalidNodes.length})"
      :text="$tr('invalidNodesFoundText')"
    >
      <template #buttons="{close}">
        <VBtn flat data-test="saveanyways" color="primary" @click="closeModal">
          {{ $tr('saveAnywaysButton') }}
        </VBtn>
        <VBtn color="primary" @click="close">
          {{ $tr('keepEditingButton') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Dialog for catching in-progress file uploads -->
    <MessageDialog
      v-model="promptUploading"
      :header="$tr('uploadInProgressHeader')"
      :text="$tr('uploadInProgressText')"
    >
      <template #buttons="{close}">
        <VBtn flat data-test="canceluploads" color="primary" @click="closeModal">
          {{ $tr('cancelUploadsButton') }}
        </VBtn>
        <VBtn color="primary" @click="close">
          {{ $tr('keepEditingButton') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Alert for failed save -->
    <MessageDialog
      v-model="promptFailed"
      :header="$tr('saveFailedHeader')"
      :text="$tr('saveFailedText')"
    >
      <template #buttons="{close}">
        <VBtn flat color="primary" @click="closeModal">
          {{ $tr('closeWithoutSavingButton') }}
        </VBtn>
        <VBtn color="primary" @click="close">
          {{ $tr('okButton') }}
        </VBtn>
      </template>
    </MessageDialog>
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames, TabNames } from '../../constants';
  import FileUploadDefault from '../../views/files/FileUploadDefault';
  import EditList from './EditList';
  import EditView from './EditView';
  import { fileSizeMixin } from 'shared/mixins';
  import FileStorage from 'shared/views/files/FileStorage';
  import MessageDialog from 'shared/views/MessageDialog';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Uploader from 'shared/views/files/Uploader';
  import LoadingText from 'shared/views/LoadingText';
  import FormatPresets from 'shared/leUtils/FormatPresets';
  import OfflineText from 'shared/views/OfflineText';
  import FileDropzone from 'shared/views/files/FileDropzone';

  export default {
    name: 'EditModal',
    components: {
      EditList,
      EditView,
      ResizableNavigationDrawer,
      Uploader,
      FileStorage,
      FileUploadDefault,
      LoadingText,
      MessageDialog,
      OfflineText,
      FileDropzone,
    },
    mixins: [fileSizeMixin],
    props: {
      detailNodeIds: {
        type: String,
        default: '',
      },
      tab: {
        type: String,
        default: TabNames.DETAILS,
      },
    },
    data() {
      return {
        loading: false,
        loadError: false,
        selected: this.nodeIds,
        promptInvalid: false,
        promptUploading: false,
        promptFailed: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeIsValid']),
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('file', ['contentNodesAreUploading']),
      multipleNodes() {
        // Only hide drawer when editing a single item
        return this.nodeIds.length > 1;
      },
      addTopicsMode() {
        return this.$route.name === RouterNames.ADD_TOPICS;
      },
      uploadMode() {
        return this.$route.name === RouterNames.UPLOAD_FILES;
      },
      /* eslint-disable kolibri/vue-no-unused-properties */
      createExerciseMode() {
        return this.$route.name === RouterNames.ADD_EXERCISE;
      },
      /* eslint-enable */
      editMode() {
        return this.$route.name === RouterNames.CONTENTNODE_DETAILS;
      },
      showStorage() {
        return this.uploadMode || this.editMode;
      },
      showToolbar() {
        return this.addTopicsMode || this.editMode || (this.uploadMode && this.nodeIds.length);
      },
      nodeIds() {
        return (this.detailNodeIds && this.detailNodeIds.split(',')) || [];
      },
      modalTitle() {
        return this.$tr('editingDetailsHeader');
      },
      parentTitle() {
        let node = this.$route.params.nodeId && this.getContentNode(this.$route.params.nodeId);
        return node ? node.title : '';
      },
      invalidNodes() {
        return this.nodeIds.filter(id => !this.getContentNodeIsValid(id));
      },
    },
    beforeRouteEnter(to, from, next) {
      if (
        to.name === RouterNames.CONTENTNODE_DETAILS ||
        to.name === RouterNames.ADD_TOPICS ||
        to.name === RouterNames.ADD_EXERCISE ||
        to.name === RouterNames.UPLOAD_FILES
      ) {
        return next(vm => {
          // Catch view-only enters before loading data
          if (!vm.canEdit) {
            return vm.navigateBack();
          }
          vm.loading = true;

          let ids = [to.params.nodeId];
          if (to.params.detailNodeIds !== undefined) {
            ids = ids.concat(to.params.detailNodeIds.split(','));
          }
          return Promise.all([
            vm.loadContentNodes({ id__in: ids }),
            vm.loadFiles({ contentnode__in: ids }),
            ...ids.map(nodeId => vm.loadRelatedResources(nodeId)),
            vm.loadAssessmentItems({ contentnode__in: ids }),
          ])
            .then(() => {
              vm.loading = false;
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
      this.selected = this.nodeIds;
    },
    methods: {
      ...mapActions('contentNode', [
        'loadContentNodes',
        'loadRelatedResources',
        'createContentNode',
      ]),
      ...mapActions('file', ['loadFiles', 'createFile']),
      ...mapActions('assessmentItem', ['loadAssessmentItems']),
      ...mapMutations('contentNode', { enableValidation: 'ENABLE_VALIDATION_ON_NODES' }),
      closeModal() {
        this.promptUploading = false;
        this.promptInvalid = false;
        this.promptFailed = false;
        this.navigateBack();
      },
      navigateBack() {
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
      handleClose() {
        // X button action
        this.enableValidation(this.nodeIds);
        // Catch uploads in progress and invalid nodes
        if (this.contentNodesAreUploading(this.nodeIds)) {
          this.promptUploading = true;
        } else if (this.invalidNodes.length) {
          this.selected = [this.invalidNodes[0]];
          this.promptInvalid = true;
        } else {
          this.closeModal();
        }
      },

      /* Creation actions */
      createNode(kind, payload = {}) {
        this.enableValidation(this.nodeIds);
        return this.createContentNode({
          kind,
          parent: this.$route.params.nodeId,
          ...payload,
        }).then(newNodeId => {
          this.$router.push({
            name: this.$route.name,
            params: {
              nodeId: this.$route.params.nodeId,
              detailNodeIds: this.nodeIds.concat(newNodeId).join(','),
            },
          });
          return newNodeId;
        });
      },
      createTopic() {
        this.createNode('topic', {
          title: '',
        }).then(newNodeId => {
          this.selected = [newNodeId];
        });
      },
      createNodesFromUploads(fileUploads) {
        fileUploads.forEach((file, index) => {
          const title = file.original_filename
            .split('.')
            .slice(0, -1)
            .join('.');
          this.createNode(
            FormatPresets.has(file.preset) && FormatPresets.get(file.preset).kind_id,
            { title }
          ).then(newNodeId => {
            if (index === 0) {
              this.selected = [newNodeId];
            }
            this.createFile({
              contentnode: newNodeId,
              ...file,
            });
          });
        });
      },
    },
    $trs: {
      editingDetailsHeader: 'Editing Content Details',
      invalidNodesFound: '{count, plural,\n =1 {# error found}\n other {# errors found}}',
      invalidNodesFoundText:
        "You won't be able to publish your channel until these errors are resolved",
      saveAnywaysButton: 'Save anyway',
      keepEditingButton: 'Keep editing',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      addTopic: 'Add Topic',
      uploadButton: 'Upload Files',
      uploadInProgressHeader: 'Upload in progress',
      uploadInProgressText:
        'Files that have not finished uploading will be removed if you finish now',
      cancelUploadsButton: 'Cancel uploads',
      closeWithoutSavingButton: 'Close without saving',
      okButton: 'OK',
      loadErrorText: 'Failed to load content',
    },
  };

</script>

<style lang="less" scoped>

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
  .edit-modal-wrapper {
    overflow-y: auto;
  }

</style>
