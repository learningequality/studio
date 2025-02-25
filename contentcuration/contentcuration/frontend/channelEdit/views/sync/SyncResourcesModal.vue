<template>

  <div>
    <!-- STEP 1 of 3: Sync dialog -->
    <KModal
      v-if="syncModal"
      :title="$tr('syncModalTitle')"
      :submitDisabled="!continueAllowed"
      :submitText="$tr('continueButtonLabel')"
      :cancelText="$tr('cancelButtonLabel')"
      :size="525"
      @cancel="syncModal = false"
      @submit="handleContinue"
    >
      <VList>
        <p>{{ $tr('syncModalExplainer') }}</p>
        <p class="mb-1">
          {{ $tr('syncModalSelectAttributes') }}
        </p>

        <VListTile @click.stop>
          <VListTileAction>
            <Checkbox v-model="syncFiles" />
          </VListTileAction>
          <VListTileContent @click="syncFiles = !syncFiles">
            <VListTileTitle>{{ $tr('syncFilesTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncFilesExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>

        <VListTile @click.stop>
          <VListTileAction>
            <Checkbox v-model="syncResourceDetails" />
          </VListTileAction>
          <VListTileContent @click="syncResourceDetails = !syncResourceDetails">
            <VListTileTitle>{{ $tr('syncResourceDetailsTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncResourceDetailsExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>

        <VListTile @click.stop>
          <VListTileAction>
            <Checkbox v-model="syncTitlesAndDescriptions" />
          </VListTileAction>
          <VListTileContent @click="syncTitlesAndDescriptions = !syncTitlesAndDescriptions">
            <VListTileTitle>{{ $tr('syncTitlesAndDescriptionsTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncTitlesAndDescriptionsExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>

        <VListTile @click.stop>
          <VListTileAction>
            <Checkbox v-model="syncExercises" />
          </VListTileAction>
          <VListTileContent @click="syncExercises = !syncExercises">
            <VListTileTitle>{{ $tr('syncExercisesTitle') }}</VListTileTitle>
            <VListTileSubTitle>{{ $tr('syncExercisesExplainer') }}</VListTileSubTitle>
          </VListTileContent>
        </VListTile>
      </VList>
      <VSpacer />
    </KModal>

    <!-- STEP 2 of 3: Confirm sync dialog -->
    <KModal
      v-if="confirmSyncModal"
      :title="$tr('confirmSyncModalTitle')"
      :submitText="$tr('syncButtonLabel')"
      :cancelText="$tr('backButtonLabel')"
      :size="525"
      @cancel="handleBack"
      @submit="handleSync"
    >
      <p class="mb-0">
        {{ $tr('confirmSyncModalExplainer') }}
      </p>
      <VCardText>
        <ul class="mb-1 mt-1 no-bullets">
          <li
            v-if="syncFiles"
            class="font-weight-bold"
          >
            {{ $tr('syncFilesTitle') }}
          </li>
          <li
            v-if="syncResourceDetails"
            class="font-weight-bold"
          >
            {{ $tr('syncResourceDetailsTitle') }}
          </li>
          <li
            v-if="syncTitlesAndDescriptions"
            class="font-weight-bold"
          >
            {{ $tr('syncTitlesAndDescriptionsTitle') }}
          </li>
          <li
            v-if="syncExercises"
            class="font-weight-bold"
          >
            {{ $tr('syncExercisesTitle') }}
          </li>
        </ul>
      </VCardText>
      <p class="mb-0">
        {{ $tr('confirmSyncModalWarningExplainer') }}
      </p>
      <VSpacer />
    </KModal>

    <!-- STEP 3 of 3: Syncing progress dialog -->
    <!-- Handled by the asyncTasksModule, see channelEdit/vuex/task/index.js -->
  </div>

</template>


<script>

  import { Channel } from 'shared/data/resources';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'SyncResourcesModal',
    components: {
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
        syncResourceDetails: false,
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
          this.syncFiles ||
          this.syncResourceDetails ||
          this.syncTitlesAndDescriptions ||
          this.syncExercises
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
          titles_and_descriptions: this.syncTitlesAndDescriptions,
          resource_details: this.syncResourceDetails,
          files: this.syncFiles,
          assessment_items: this.syncExercises,
        })
          .then(() => {
            this.confirmSyncModal = false;
            this.$emit('syncing');
          })
          .catch(() => {
            // add a way for the progress modal to provide feedback titles_and_descriptions
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
      syncModalExplainer:
        'Syncing resources in Kolibri Studio updates copied or imported resources in this channel with any changes made to the original resource files.',
      syncModalSelectAttributes: 'Select what you would like to sync:',
      syncFilesTitle: 'Files',
      syncFilesExplainer: 'Update all files, including: thumbnails, subtitles, and captions',
      syncResourceDetailsTitle: 'Resource details',
      syncResourceDetailsExplainer:
        'Update information about the resource: learning activity, level, requirements, category, tags, audience, and source',
      syncTitlesAndDescriptionsTitle: 'Titles and descriptions',
      syncTitlesAndDescriptionsExplainer: 'Update resource titles and descriptions',
      syncExercisesTitle: 'Assessment details',
      syncExercisesExplainer: 'Update questions, answers, and hints in exercises and quizzes',
      cancelButtonLabel: 'Cancel',
      continueButtonLabel: 'Continue',
      //
      // Confirm sync (Step 2 of 3)
      confirmSyncModalTitle: 'Confirm sync',
      confirmSyncModalExplainer: 'You are about to sync and update the following:',
      confirmSyncModalWarningExplainer:
        'Warning: this will overwrite any changes you have made to copied or imported resources.',
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


<style lang="scss" scoped>

  // counteract the effect of the VCardText that is wrapping the VList component
  .v-card ::v-deep .v-card__text {
    padding: 0;
  }

  ::v-deep .v-list__tile {
    align-items: flex-start;
    height: unset;
    padding: 8px 0;
  }

  .v-list__tile__action {
    min-width: 42px;
    height: unset;
    padding: 2px 0 0;
  }

  .v-list__tile__sub-title {
    width: unset;
    white-space: unset;
  }

  .no-bullets {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

</style>
