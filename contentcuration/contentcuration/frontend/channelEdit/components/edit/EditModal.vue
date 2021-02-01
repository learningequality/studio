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
        <Uploader
          allowMultiple
          displayOnly
          :uploadingHandler="createNodesFromUploads"
          @upload="trackUpload"
        >
          <template #default="{ openFileDialog, handleFiles }">
            <!-- Toolbar + extension -->
            <VToolbar
              dark
              color="primary"
              fixed
              flat
              :clipped-left="!$isRTL"
              :clipped-right="$isRTL"
              app
            >
              <VBtn data-test="close" icon dark @click="handleClose">
                <Icon>clear</Icon>
              </VBtn>
              <VToolbarTitle>{{ modalTitle }}</VToolbarTitle>
              <VSpacer />
              <VToolbarItems>
                <div class="py-3">
                  <OfflineText indicator />
                </div>
              </VToolbarItems>
            </VToolbar>

            <!-- List items -->
            <ResizableNavigationDrawer
              v-if="showDrawer"
              localName="edit-modal"
              stateless
              clipped
              app
              style="height: calc(100% - 64px);"
              :minWidth="150"
              :maxWidth="500"
              @scroll="scroll"
            >
              <FileDropzone fill :disabled="!uploadMode" @dropped="handleFiles">
                <ToolBar
                  v-if="addTopicsMode || uploadMode"
                  :flat="!listElevated"
                  class="add-wrapper"
                  color="white"
                >
                  <VBtn v-if="addTopicsMode" color="greyBackground" @click="createTopic">
                    {{ $tr('addTopic') }}
                  </VBtn>
                  <VBtn v-else-if="uploadMode" color="greyBackground" @click="openFileDialog">
                    {{ $tr('uploadButton') }}
                  </VBtn>
                </ToolBar>
                <div ref="list">
                  <EditList
                    v-model="selected"
                    :nodeIds="nodeIds"
                    @input="enableValidation(nodeIds);"
                  />
                </div>
              </FileDropzone>
            </ResizableNavigationDrawer>

            <!-- Main editing area -->
            <VContent>
              <VLayout v-if="loadError" align-center justify-center fill-height class="py-5">
                <VFlex class="text-xs-center">
                  <Icon color="red">
                    error
                  </Icon>
                  <p>{{ $tr('loadErrorText') }}</p>
                </VFlex>
              </VLayout>
              <LoadingText v-else-if="loading" />
              <FileUploadDefault
                v-else-if="showFileUploadDefault"
                :parentTitle="parentTitle"
                :handleFiles="handleFiles"
                :openFileDialog="openFileDialog"
              />
              <EditView
                v-else
                ref="editView"
                :nodeIds="selected"
                :tab="tab"
              />
            </VContent>
          </template>
        </Uploader>
      </VCard>
      <BottomBar v-if="!loading && !loadError && !showFileUploadDefault">
        <VLayout row align-center fill-height class="px-2">
          <VFlex v-if="showStorage" shrink>
            <FileStorage />
          </VFlex>
          <VSpacer />
          <VFlex v-if="online" shrink>
            <div class="mt-1 py-3">
              <SavingIndicator :nodeIds="nodeIds" />
            </div>
          </VFlex>
          <VFlex shrink>
            <VBtn color="primary" @click="handleClose">
              {{ $tr('finishButton') }}
            </VBtn>
          </VFlex>
        </VLayout>
      </BottomBar>
    </VDialog>

    <!-- Dialog for catching unsaved changes -->
    <MessageDialog
      v-model="promptInvalid"
      :header="$tr('invalidNodesFound', { count: invalidNodes.length })"
      :text="$tr('invalidNodesFoundText')"
    >
      <template #buttons="{ close }">
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
      <template #buttons="{ close }">
        <VBtn flat @click="close">
          {{ $tr('dismissDialogButton') }}
        </VBtn>
        <VBtn data-test="canceluploads" color="primary" @click="closeModal">
          {{ $tr('cancelUploadsButton') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Alert for failed save -->
    <MessageDialog
      v-model="promptFailed"
      :header="$tr('saveFailedHeader')"
      :text="$tr('saveFailedText')"
    >
      <template #buttons="{ close }">
        <VBtn flat @click="close">
          {{ $tr('okButton') }}
        </VBtn>
        <VBtn color="primary" @click="closeModal">
          {{ $tr('closeWithoutSavingButton') }}
        </VBtn>
      </template>
    </MessageDialog>
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { RouterNames, TabNames } from '../../constants';
  import FileUploadDefault from '../../views/files/FileUploadDefault';
  import EditList from './EditList';
  import EditView from './EditView';
  import SavingIndicator from './SavingIndicator';
  import { fileSizeMixin, routerMixin } from 'shared/mixins';
  import FileStorage from 'shared/views/files/FileStorage';
  import MessageDialog from 'shared/views/MessageDialog';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Uploader from 'shared/views/files/Uploader';
  import LoadingText from 'shared/views/LoadingText';
  import FormatPresets from 'shared/leUtils/FormatPresets';
  import OfflineText from 'shared/views/OfflineText';
  import ToolBar from 'shared/views/ToolBar';
  import BottomBar from 'shared/views/BottomBar';
  import FileDropzone from 'shared/views/files/FileDropzone';
  import { isNodeComplete } from 'shared/utils/validation';

  const CHECK_STORAGE_INTERVAL = 10000;

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
      SavingIndicator,
      ToolBar,
      BottomBar,
    },
    mixins: [fileSizeMixin, routerMixin],
    props: {
      detailNodeIds: {
        type: String,
        default: '',
      },
      tab: {
        type: String,
        default: TabNames.DETAILS,
      },
      // Catch cases where user is navigating back from another view
      // (e.g. selecting related resources)
      targetNodeId: {
        type: String,
        required: false,
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
        listElevated: false,
        storagePoll: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeIsValid']),
      ...mapGetters('assessmentItem', ['getAssessmentItems']),
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('file', ['contentNodesAreUploading', 'getContentNodeFiles']),
      ...mapState({
        online: state => state.connection.online,
      }),
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
      showDrawer() {
        return (
          !this.loading &&
          (this.multipleNodes || (this.uploadMode && this.nodeIds.length) || this.addTopicsMode)
        );
      },
      showFileUploadDefault() {
        return this.uploadMode && !this.nodeIds.length;
      },
      nodeIds() {
        return (this.detailNodeIds && this.detailNodeIds.split(',')) || [];
      },
      modalTitle() {
        if (this.createExerciseMode) {
          return this.$tr('createExerciseHeader');
        } else if (this.uploadMode) {
          return this.nodeIds.length ? this.$tr('editFilesHeader') : this.$tr('uploadFilesHeader');
        } else if (this.addTopicsMode) {
          return this.$tr('addTopicsHeader');
        }
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

          let promises;

          const parentTopicId = to.params.nodeId;
          const childrenNodesIds =
            to.params.detailNodeIds !== undefined ? to.params.detailNodeIds.split(',') : [];
          // remove duplicates - if a topic is being edited,
          // then parent topic ID is also in children nodes IDs
          const allNodesIds = [...new Set([...childrenNodesIds, parentTopicId])];

          // Nice to have TODO: Refactor EditModal to make each tab
          // responsible for fetching data that it needs
          if (childrenNodesIds.length) {
            promises = [
              vm.loadContentNodes({ id__in: allNodesIds }),
              ...childrenNodesIds.map(nodeId => vm.loadRelatedResources(nodeId)),
              // Do not remove - there is a logic that relies heavily
              // on assessment items and files being properly loaded
              // (especially marking nodes as (in)complete)
              vm.loadFiles({ contentnode__in: childrenNodesIds }),
              vm.loadAssessmentItems({ contentnode__in: childrenNodesIds }),
            ];
          } else {
            // no need to load assessment items or files as topics have none
            promises = [vm.loadContentNode(parentTopicId)];
          }
          return Promise.all(promises)
            .then(() => {
              vm.updateTitleForPage();
              vm.loading = false;
            })
            .catch(() => {
              vm.loading = false;
              vm.loadError = true;
            })
            .then(() => {
              // self-healing of nodes' validation status
              // in case we receive incorrect data from backend
              let validationPromises = [];
              allNodesIds.forEach(nodeId => {
                const node = vm.getContentNode(nodeId);
                const completeCheck = isNodeComplete({
                  nodeDetails: node,
                  assessmentItems: vm.getAssessmentItems(nodeId),
                  files: vm.getContentNodeFiles(nodeId),
                });

                if (completeCheck !== node.complete) {
                  validationPromises.push(
                    vm.updateContentNode({ id: nodeId, complete: completeCheck })
                  );
                }
              });
              return Promise.all(validationPromises);
            });
        });
      }
      return next(false);
    },
    mounted() {
      this.hideHTMLScroll(true);
      this.selected = this.targetNodeId ? [this.targetNodeId] : this.nodeIds;
      this.storagePoll = setInterval(this.fetchUserStorage, CHECK_STORAGE_INTERVAL);
    },
    methods: {
      ...mapActions(['fetchUserStorage']),
      ...mapActions('contentNode', [
        'loadContentNode',
        'loadContentNodes',
        'updateContentNode',
        'loadRelatedResources',
        'createContentNode',
      ]),
      ...mapActions('file', ['loadFiles', 'updateFile']),
      ...mapActions('assessmentItem', ['loadAssessmentItems', 'updateAssessmentItems']),
      ...mapMutations('contentNode', { enableValidation: 'ENABLE_VALIDATION_ON_NODES' }),
      closeModal() {
        this.promptUploading = false;
        this.promptInvalid = false;
        this.promptFailed = false;
        clearInterval(this.storagePoll);
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
      scroll(e) {
        this.listElevated = e.target.scrollTop > 0;
      },

      /* Button actions */
      handleClose() {
        // X button action
        this.enableValidation(this.nodeIds);
        let assessmentItems = this.getAssessmentItems(this.nodeIds);
        assessmentItems.forEach(item => (item.question ? (item.isNew = false) : ''));
        this.updateAssessmentItems(assessmentItems);
        // reaches into Details Tab to run save of diffTracker
        // before the validation pop up is executed
        this.$refs.editView.immediateSaveAll().then(() => {
          // Catch uploads in progress and invalid nodes
          if (this.invalidNodes.length) {
            this.selected = [this.invalidNodes[0]];
            this.promptInvalid = true;
          } else if (this.contentNodesAreUploading(this.nodeIds)) {
            this.promptUploading = true;
          } else {
            this.closeModal();
          }
        });
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
            this.updateFile({
              ...file,
              contentnode: newNodeId,
            });
          });
        });
      },
      updateTitleForPage() {
        this.updateTabTitle(this.$store.getters.appendChannelName(this.modalTitle));
      },
      trackUpload() {
        this.$analytics.trackAction('file_uploader', 'Add files', {
          eventLabel: 'Upload file',
        });
      },
    },
    $trs: {
      editingDetailsHeader: 'Edit details',
      uploadFilesHeader: 'Upload files',
      editFilesHeader: 'Edit files',
      createExerciseHeader: 'New exercise',
      addTopicsHeader: 'New topic',
      invalidNodesFound:
        '{count, plural,\n =1 {# incomplete resource found}\n other {# incomplete resources found}}',
      invalidNodesFoundText:
        'Incomplete resources will not be published until these errors are resolved',
      saveAnywaysButton: 'Exit anyway',
      keepEditingButton: 'Keep editing',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      addTopic: 'Add new topic',
      uploadButton: 'Upload more',
      uploadInProgressHeader: 'Upload in progress',
      uploadInProgressText: 'Uploads that are in progress will be lost if you exit',
      dismissDialogButton: 'Cancel',
      cancelUploadsButton: 'Exit',
      closeWithoutSavingButton: 'Close without saving',
      okButton: 'OK',
      loadErrorText: 'Failed to load content',
      finishButton: 'Finish',
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
  /deep/ .v-content__wrap {
    max-height: calc(100vh - 128px);
    overflow-y: auto;
  }

  .add-wrapper {
    position: sticky;
    top: 0;
    z-index: 5;
    width: calc(100% + 4px);
    margin: 0 -3px;
    margin-top: -4px !important;
  }

</style>
