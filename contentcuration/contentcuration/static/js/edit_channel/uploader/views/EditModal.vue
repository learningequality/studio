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
            <VFlex alignCenter>
              <div v-if="saving">
                <VProgressCircular
                  indeterminate
                  size="15"
                  width="2"
                  color="white"
                />
                Autosaving...
              </div>
              <div v-else-if="lastSaved">
                {{ savedMessage }}
              </div>
            </VFlex>
            <VBtn v-if="!isViewOnly" dark flat @click="saveContent">
              {{ $tr('saveAndCloseButtonText') }}
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

  import { mapState } from 'vuex';
  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';

  const AUTOSAVE_TIMER = 15000;
  const AUTOSAVE_MESSAGE_TIMER = 10000;

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
      savedMessage: 'Saved {relativeTime}',
      savedNowMessage: 'Saved just now',
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
      };
    },
    computed: {
      ...mapState('edit_modal', ['changed']),
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
      openModal() {
        this.dialog = true;
        let timingInterval;
        this.interval = setInterval(() => {
          // if(this.changed) {
          clearInterval(timingInterval);
          this.saving = true;
          setTimeout(() => {
            this.lastSaved = Date.now();
            this.saving = false;
            timingInterval = setInterval(() => {
              this.savedMessage = this.getSavedTime();
            }, AUTOSAVE_MESSAGE_TIMER);
          }, 1000);
          // }
        }, AUTOSAVE_TIMER);
      },
      getSavedTime() {
        return this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
      saveContent() {
        this.closeModal();
      },
      closeModal() {
        clearInterval(this.interval);
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
