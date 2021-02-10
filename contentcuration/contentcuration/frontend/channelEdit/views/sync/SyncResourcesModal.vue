<template>

  <div>
    <!-- STEP 1 of 3: Sync dialog -->
    <PrimaryDialog v-model="syncModal" :title="$tr('syncModalTitle')" lazy>
      <VList subheader two-line>
        <VSubheader>{{ $tr('syncModalExplainer') }}</VSubheader>

        <VListTile @click.stop>
          <VListTileAction>
            <Checkbox v-model="syncFiles" color="primary" />
          </VListTileAction>
          <VListTileContent @click="syncFiles = !syncFiles">
            <VListTileTitle>{{ $tr('syncFilesTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncFilesExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>

        <VListTile @click.stop>
          <VListTileAction>
            <VCheckbox v-model="syncTags" color="primary" />
          </VListTileAction>
          <VListTileContent @click="syncTags = !syncTags">
            <VListTileTitle>{{ $tr('syncTagsTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncTagsExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>

        <VListTile @click.stop>
          <VListTileAction>
            <VCheckbox v-model="syncTitlesAndDescriptions" color="primary" />
          </VListTileAction>
          <VListTileContent @click="syncTitlesAndDescriptions = !syncTitlesAndDescriptions">
            <VListTileTitle>{{ $tr('syncTitlesAndDescriptionsTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncTitlesAndDescriptionsExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>

        <VListTile @click.stop>
          <VListTileAction>
            <VCheckbox v-model="syncExercises" color="primary" />
          </VListTileAction>
          <VListTileContent @click="syncExercises = !syncExercises">
            <VListTileTitle>{{ $tr('syncExercisesTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncExercisesExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>
      </VList>
      <VSpacer />
      <template v-slot:actions>
        <VSpacer />
        <VBtn flat @click="syncModal = false">
          {{ $tr('cancelButtonLabel') }}
        </VBtn>
        <VBtn color="primary" :disabled="!continueAllowed" @click="handleContinue">
          {{ $tr('continueButtonLabel') }}
        </VBtn>
      </template>
    </PrimaryDialog>

    <!-- STEP 2 of 3: Confirm sync dialog -->
    <PrimaryDialog v-model="confirmSyncModal" :title="$tr('confirmSyncModalTitle')" lazy>
      <VSubheader>{{ $tr('confirmSyncModalExplainer') }}</VSubheader>
      <VCardText>
        <ul class="mb-4 ml-3 mt-2">
          <li v-if="syncFiles" class="font-weight-bold">
            {{ $tr('syncFilesTitle') }}
          </li>
          <li v-if="syncTags" class="font-weight-bold">
            {{ $tr('syncTagsTitle') }}
          </li>
          <li v-if="syncTitlesAndDescriptions" class="font-weight-bold">
            {{ $tr('syncTitlesAndDescriptionsTitle') }}
          </li>
          <li v-if="syncExercises" class="font-weight-bold">
            {{ $tr('syncExercisesTitle') }}
          </li>
        </ul>
      </VCardText>
      <VSpacer />
      <template v-slot:actions>
        <VSpacer />
        <VBtn flat @click="handleBack">
          {{ $tr('backButtonLabel') }}
        </VBtn>
        <VBtn color="primary" @click="handleSync">
          {{ $tr('syncButtonLabel') }}
        </VBtn>
      </template>
    </PrimaryDialog>

    <!-- STEP 3 of 3: Syncing progress dialog -->
    <!-- Handled by the asyncTasksModule, see channelEdit/vuex/task/index.js -->
  </div>

</template>

<script>

  import { Channel } from 'shared/data/resources';
  import Checkbox from 'shared/views/form/Checkbox';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'SyncResourcesModal',
    components: {
      PrimaryDialog,
      Checkbox,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      channel: {
        type: Object,
        required: true,
        validator(channel) {
          return channel.id;
        },
      },
    },
    data() {
      return {
        // the should show modal first step state is the value prop
        confirmSyncModal: false, // the should show second step
        // user choices about which kind of resources to sync
        syncFiles: false,
        syncTags: false,
        syncTitlesAndDescriptions: false,
        syncExercises: false,
      };
    },
    computed: {
      syncModal: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      channelId() {
        return this.channel.id;
      },
      continueAllowed() {
        // allow CONTINUE button to appear only if something will be synced
        return (
          this.syncFiles || this.syncTags || this.syncTitlesAndDescriptions || this.syncExercises
        );
      },
    },
    methods: {
      handleContinue() {
        this.syncModal = false;
        this.$nextTick(() => {
          this.confirmSyncModal = true;
        });
      },
      handleBack() {
        this.confirmSyncModal = false;
        // allow time for modal to close, via https://stackoverflow.com/a/47636157
        this.$nextTick(() => {
          this.syncModal = true;
        });
      },
      handleSync() {
        Channel.sync(this.channelId, {
          attributes: this.syncTitlesAndDescriptions,
          tags: this.syncTags,
          files: this.syncFiles,
          assessment_items: this.syncExercises,
        })
          .then(() => {
            this.confirmSyncModal = false;
            this.$emit('syncing');
          })
          .catch(() => {
            // add a way for the progress modal to provide feedback
            // since the available error message doesn't make sense here,
            // for now we will just have the operation be reported complete
            // see ProgressModal nothingToSync for more info
            this.confirmSyncModal = false;
            this.$emit('nosync');
          });
      },
    },
    $trs: {
      // Sync modal (Step 1 of 3)
      syncModalTitle: 'Sync resources',
      syncModalExplainer: 'Sync and update your resources with their original source.',
      syncFilesTitle: 'Files',
      syncFilesExplainer: 'Update all file information',
      syncTagsTitle: 'Tags',
      syncTagsExplainer: 'Update all tags',
      syncTitlesAndDescriptionsTitle: 'Titles and descriptions',
      syncTitlesAndDescriptionsExplainer: 'Update resource titles and descriptions',
      syncExercisesTitle: 'Assessment details',
      syncExercisesExplainer: 'Update questions, answers, and hints',
      cancelButtonLabel: 'Cancel',
      continueButtonLabel: 'Continue',
      //
      // Confirm sync (Step 2 of 3)
      confirmSyncModalTitle: 'Confirm sync',
      confirmSyncModalExplainer: 'You are about to sync and update the following:',
      backButtonLabel: 'Back',
      syncButtonLabel: 'Sync',
      //
      // Syncing content (Step 3 of 3) (handled by the asyncTasksModule)
      // syncingContentTitle: 'Syncing content',
      // syncingContentModalExplainer: 'Syncing task is in progres, please wait...',
      // stopSyncButtonLabel: 'stop sync',
    },
  };

</script>


<style lang="less" scoped>

  // counteract the effect of the VCardText that is wrapping the VList component
  .v-card /deep/ .v-card__text {
    padding: 0;
  }

  .v-list__tile {
    height: unset;
    min-height: 72px;
  }

  .v-list__tile__sub-title {
    width: unset;
    white-space: unset;
  }

</style>
