<template>
  <div class="edit-modal-wrapper">
    <VDialog v-model="dialog" fullscreen hideOverlay transition="dialog-bottom-transition" lazy>
      <template #activator="{on}">
        <VBtn v-on="on">
          Open Dialog
        </VBtn>
      </template>
      <VCard>
        <EditList ref="editlist" :mode="mode" />
        <VToolbar dark color="primary" fixed clippedLeft app>
          <VBtn icon dark app @click="closeModal">
            <VIcon>close</VIcon>
          </VBtn>
          <VToolbarTitle>{{ $tr(mode) }}</VToolbarTitle>
          <VSpacer />
          <VToolbarItems>
            <VBtn v-if="!isViewOnly" dark flat @click="saveContent">
              {{ $tr('saveButtonText') }}
            </VBtn>
            <VBtn v-if="!isViewOnly" dark flat @click="saveContent">
              {{ $tr('saveAndCloseButtonText') }}
            </VBtn>
            <VBtn v-if="isViewOnly" dark flat @click="copyContent">
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

  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';

  export default {
    name: 'EditModal',
    $trs: {
      [modes.EDIT]: 'Editing Content Details',
      [modes.VIEW_ONLY]: 'Viewing Content Details',
      [modes.NEW_TOPIC]: 'Adding Topics',
      [modes.NEW_EXERCISE]: 'Adding Exercises',
      [modes.UPLOAD]: 'Uploading Files',
      saveButtonText: 'Save',
      saveAndCloseButtonText: 'Save & Close',
      copyButtonText: 'Copy',
    },
    components: {
      EditList,
      EditView,
    },
    props: {
      mode: {
        type: String,
        default: modes.NEW_EXERCISE,
      },
    },
    data() {
      return {
        dialog: true,
      };
    },
    computed: {
      isViewOnly() {
        return this.mode === modes.VIEW_ONLY;
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
}
</style>
