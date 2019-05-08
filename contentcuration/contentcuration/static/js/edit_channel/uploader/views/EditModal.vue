<template>
  <div class="edit-modal-wrapper">
    <VDialog v-model="dialog" fullscreen hideOverlay transition="dialog-bottom-transition" lazy>
      <template #activator="{on}">
        <VBtn v-on="on">
          Open Dialog
        </VBtn>
      </template>
      <VCard>
        <EditList ref="editlist" />
        <VToolbar dark color="primary" fixed clippedLeft app>
          <VBtn icon dark app @click="closeModal">
            <VIcon>close</VIcon>
          </VBtn>
          <VToolbarTitle>{{ headerText }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VBtn v-if="!viewOnly" dark flat @click="saveContent">
              {{ $tr('saveButtonText') }}
            </VBtn>
            <VBtn v-if="!viewOnly" dark flat @click="saveContent">
              {{ $tr('saveAndCloseButtonText') }}
            </VBtn>
            <VBtn v-if="viewOnly" dark flat @click="copyContent">
              {{ $tr('copyButtonText') }}
            </VBtn>
          </VToolbarItems>
        </VToolbar>

        <EditView />
      </VCard>
    </VDialog>
  </div>
</template>

<script>

  import { mapState } from 'vuex';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';

  export default {
    name: 'EditModal',
    $trs: {
      editingHeader: 'Editing Content Details',
      viewingHeader: 'Viewing Content Details',
      newTopicHeader: 'Adding Topics',
      newExerciseHeader: 'Adding Exercises',
      uploadingFilesHeader: 'Uploading Files',
      saveButtonText: 'Save',
      saveAndCloseButtonText: 'Save & Close',
      copyButtonText: 'Copy',
    },
    components: {
      EditList,
      EditView,
    },
    props: {
      newTopic: {
        type: Boolean,
        default: false,
      },
      newExercise: {
        type: Boolean,
        default: false,
      },
      uploadingFiles: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        dialog: true,
      };
    },
    computed: {
      ...mapState('edit_modal', ['viewOnly']),
      headerText() {
        if (this.viewOnly) return this.$tr('viewingHeader');
        else if (this.editingMode) return this.$tr('editingHeader');
        else if (this.newTopic) return this.$tr('newTopicHeader');
        else if (this.newExercise) return this.$tr('newExerciseHeader');
        else if (this.uploadingFiles) return this.$tr('uploadingFilesHeader');
        return this.$tr('editingHeader');
      },
    },
    watch: {
      dialog(val) {
        // Temporary workaround while waiting for Vuetify bug
        // to be fixed https://github.com/vuetifyjs/vuetify/issues/5617
        if (val) {
          setTimeout(() => {
            this.$refs.editlist.openDrawer();
          }, 300);
        }
      },
    },
    mounted() {
      this.openModal();
    },
    methods: {
      openModal() {
        this.dialog = true;
      },
      saveContent() {
        this.closeModal();
      },
      closeModal() {
        this.dialog = false;
        this.$emit('modalclosed');
      },
      copyContent() {},
    },
  };

</script>

<style lang="less">

@import '../../../../less/edit-modal.less';

</style>
