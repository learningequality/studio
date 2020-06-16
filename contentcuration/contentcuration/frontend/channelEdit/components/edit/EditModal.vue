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
          <VBtn data-test="close" icon dark @click="handleClose">
            <Icon>close</Icon>
          </VBtn>
          <VToolbarTitle>{{ modalTitle }}</VToolbarTitle>
          <VSpacer />
          <VBtn v-if="canEdit" data-test="save" dark flat @click="handleClose">
            {{ $tr('saveButtonText') }}
          </VBtn>
          <VBtn v-else data-test="copy" dark flat @click="copyContent">
            {{ $tr('copyButtonText', {
              count: nodes.length, size: formatFileSize(totalFileSize)}) }}
          </VBtn>
          <template v-if="showToolbar && !loading && !loadError" #extension>
            <VToolbar light color="white" flat>
              <VBtn v-if="addTopicsMode" color="primary" @click="createTopic">
                {{ $tr('addTopic') }}
              </VBtn>
              <Uploader
                v-else-if="uploadMode"
                allowMultiple
                @uploading="createNodesFromUploads"
              >
                <template #default="{openFileDialog}">
                  <VBtn color="primary" @click="openFileDialog">
                    {{ $tr('uploadButton') }}
                  </VBtn>
                </template>
              </Uploader>
              <VSpacer />
              <VFlex v-if="showStorage" class="text-xs-right">
                <FileStorage />
              </VFlex>
            </VToolbar>
          </template>
        </VToolbar>
        <ResizableNavigationDrawer
          v-if="multipleNodes && !loading"
          localName="edit-modal"
          stateless
          clipped
          app
          :minWidth="150"
        >
          <Uploader
            fill
            allowMultiple
            :readonly="!canEdit"
            @uploading="createNodesFromUploads"
          >
            <EditList
              v-model="selected"
              :nodeIds="nodeIds"
              @input="enableValidation(nodeIds);"
            />
          </Uploader>
        </ResizableNavigationDrawer>
        <VCardText style="height: 100%;">
          <VContent style="height: 100%;">
            <VLayout v-if="loadError" align-center justify-center fill-height>
              <VFlex class="text-xs-center">
                <Icon color="red">
                  error
                </Icon>
                <p>{{ $tr('loadErrorText') }}</p>
              </VFlex>
            </VLayout>
            <LoadingText v-else-if="loading" absolute>
              <VFlex class="text-xs-center">
                <VProgressCircular indeterminate color="grey" />
                <p class="title mt-4">
                  {{ $tr('loading') }}
                </p>
              </VFlex>
            </LoadingText>
            <FileUploadDefault
              v-else-if="uploadMode && !nodeIds.length"
              :parentTitle="parentTitle"
              @uploading="createNodesFromUploads"
            />
            <EditView
              v-else
              :nodeIds="selected"
              :tab="tab"
            />
          </VContent>
        </VCardText>
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

    <!-- Alert for related content -->
    <Alert
      ref="relatedalert"
      :header="$tr('relatedContentHeader')"
      :text="$tr('relatedContentText')"
      messageID="relatedContentAlertOnCopyFromEditModal"
    />

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
  import Alert from 'shared/views/Alert';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Uploader from 'shared/views/files/Uploader';
  import LoadingText from 'shared/views/LoadingText';
  import FormatPresets from 'shared/leUtils/FormatPresets';

  export default {
    name: 'EditModal',
    components: {
      EditList,
      EditView,
      Alert,
      ResizableNavigationDrawer,
      Uploader,
      FileStorage,
      FileUploadDefault,
      LoadingText,
      MessageDialog,
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
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodes', 'getContentNodeIsValid']),
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('file', ['contentNodesTotalSize', 'contentNodesAreUploading']),
      multipleNodes() {
        // Only hide drawer when editing a single item
        return this.nodeIds.length > 1;
      },
      addTopicsMode() {
        return this.canEdit && this.$route.name === RouterNames.ADD_TOPICS;
      },
      uploadMode() {
        return this.canEdit && this.$route.name === RouterNames.UPLOAD_FILES;
      },
      /* eslint-disable kolibri/vue-no-unused-properties */
      createExerciseMode() {
        return this.canEdit && this.$route.name === RouterNames.ADD_EXERCISE;
      },
      /* eslint-enable */
      editMode() {
        return this.canEdit && this.$route.name === RouterNames.CONTENTNODE_DETAILS;
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
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      totalFileSize() {
        return this.contentNodesTotalSize(this.nodeIds);
      },
      modalTitle() {
        return this.canEdit ? this.$tr('editingDetailsHeader') : this.$tr('viewingDetailsHeader');
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
          vm.loading = true;

          let ids = [to.params.nodeId];
          if (to.params.detailNodeIds !== undefined) {
            ids = ids.concat(to.params.detailNodeIds.split(','));
          }
          return Promise.all([
            vm.loadContentNodes({ id__in: ids }),
            vm.loadFiles({ contentnode__in: ids }),
            ...ids.map(nodeId => vm.loadRelatedResources(nodeId)),
            ...ids.map(nodeId => vm.loadNodeAssessmentItems(nodeId)),
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
    beforeMount() {
      // Block view only mode from entering this route
      if (!this.canEdit) {
        this.navigateBack();
      }
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
      ...mapActions('assessmentItem', ['loadNodeAssessmentItems']),
      ...mapActions('clipboard', ['copyAll']),
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
      copyContent() {
        // Main action when modal is opened in view only mode
        if (this.nodes.some(n => n.prerequisite.length || n.is_prerequisite_of.length)) {
          this.$refs.relatedalert.prompt();
        }
        this.copyAll(this.nodeIds).then(() => {
          this.closeModal();
        });
      },
      handleClose() {
        // X button action
        if (!this.canEdit) {
          this.closeModal();
        } else {
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
          title: this.$tr('topicDefaultTitle', { parentTitle: this.parentTitle }),
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
      viewingDetailsHeader: 'Viewing Content Details',
      saveButtonText: 'Finish',
      copyButtonText:
        '{count, plural,\n =1 {Copy to clipboard}\n other {Copy # items to clipboard}} ({size})',
      invalidNodesFound: '{count, plural,\n =1 {# error found}\n other {# errors found}}',
      invalidNodesFoundText:
        "You won't be able to publish your channel until these errors are resolved",
      saveAnywaysButton: 'Save anyway',
      keepEditingButton: 'Keep editing',
      relatedContentHeader: 'Related content detected',
      relatedContentText: 'Related content will not be included in the copy of this content.',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      topicDefaultTitle: '{parentTitle} topic',
      addTopic: 'Add Topic',
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
