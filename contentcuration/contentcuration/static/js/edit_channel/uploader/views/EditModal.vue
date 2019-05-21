<template>
  <div class="edit-modal-wrapper">
    <VDialog v-model="dialog" fullscreen hideOverlay transition="dialog-bottom-transition" lazy>
      <VCard>
        <VNavigationDrawer v-model="drawer.open" stateless clipped app class="edit-list">
          <EditList :mode="mode" />
        </VNavigationDrawer>
        <VToolbar dark color="primary" fixed clippedLeft app>
          <VBtn icon dark app @click="closeModal">
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
  </div>
</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import EditList from './EditList.vue';
  import EditView from './EditView.vue';

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
    },
    components: {
      EditList,
      EditView,
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
        drawer: {
          open: true,
        },
      };
    },
    computed: {
      ...mapState('edit_modal', ['nodes']),
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
      changed(changed) {
        changed ? this.throttleSave()() : clearInterval(this.updateInterval);
      },
    },
    beforeMount() {
      this.drawer.open = this.showEditList;
    },
    methods: {
      ...mapActions('edit_modal', ['saveNodes']),
      ...mapMutations('edit_modal', { select: 'SELECT_NODE' }),
      openModal() {
        this.dialog = true;
        this.select(0);
      },
      updateSavedTime() {
        this.savedMessage = this.$tr('savedMessage', {
          relativeTime: this.$formatRelative(this.lastSaved),
        });
      },
      saveContent() {
        this.saving = true;
        this.saveNodes().then(() => {
          this.closeModal();
        });
      },
      throttleSave() {
        return _.throttle(this.save, SAVE_TIMER, { leading: false });
      },
      save() {
        clearInterval(this.updateInterval);
        this.saving = true;
        this.saveNodes().then(() => {
          this.lastSaved = Date.now();
          this.saving = false;
          this.updateSavedTime();
          this.updateInterval = setInterval(this.updateSavedTime, SAVE_MESSAGE_TIMER);
        });
      },
      closeModal() {
        clearInterval(this.updateInterval);
        this.saving = false;
        this.lastSaved = null;
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
