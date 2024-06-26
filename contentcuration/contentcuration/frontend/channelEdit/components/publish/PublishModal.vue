<template>

  <div>
    <!--
      STEP 1 of 3: Incomplete resources
      (displayed only when some incomplete resources are found)
    -->
    <KModal
      v-if="step === 0"
      :title="currentChannel.name"
      :submitText="$tr('nextButton')"
      :cancelText="$tr('cancelButton')"
      data-test="incomplete-modal"
      @submit="step++"
      @cancel="close"
    >
      <p class="subheading">
        <Icon icon="warningIncomplete" />
        <span class="mx-2">
          {{ $tr('incompleteCount', { count: node.error_count }) }}
        </span>
      </p>
      <p class="subheading">
        {{ $tr('incompleteWarning') }}
      </p>
      <p class="subheading">
        {{ $tr('incompleteInstructions') }}
      </p>
    </KModal>

    <!-- STEP 2 of 3: Set version and confirm publish -->
    <KModal
      v-if="step === 1"
      :title="currentChannel.name"
      :submitText="$tr('publishButton')"
      :cancelText="$tr('cancelButton')"
      data-test="confirm-publish-modal"
      @submit="handlePublish"
      @cancel="close"
    >
      <p class="subheading">
        {{ $tr('publishMessageLabel') }}
      </p>

      <KFixedGrid :numCols="12">
        <KGridItem :layout="{ span: 11 }">
          <KTextbox
            v-model="publishDescription"
            :label="$tr('versionDescriptionLabel')"
            :invalid="!isDescriptionValid"
            :invalidText="$tr('descriptionRequiredMessage')"
            :showInvalidText="showInvalidText"
            autofocus
            textArea
          />
        </KGridItem>
        <KGridItem :layout="{ span: 1 }">
          <HelpTooltip :text="$tr('descriptionDescriptionTooltip')" bottom />
        </KGridItem>
      </KFixedGrid>
    </KModal>

    <!-- STEP 3 of 3: Publishing progress dialog -->
    <!-- Handled by the asyncTasksModule, see channelEdit/vuex/task/index.js -->
  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { forceServerSync } from 'shared/data/serverSync';

  export default {
    name: 'PublishModal',
    components: {
      HelpTooltip,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        step: 0,
        publishDescription: '',
        size: 0,
        showInvalidText: false, // lazy validation
        loading: false,
        loadingTaskId: null,
      };
    },
    computed: {
      ...mapGetters(['areAllChangesSaved']),
      ...mapGetters('currentChannel', ['currentChannel', 'rootId']),
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('task', ['getAsyncTask']),
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      node() {
        return this.getContentNode(this.rootId);
      },
      isDescriptionValid() {
        return this.publishDescription && this.publishDescription.trim();
      },
      sizeCalculationTask() {
        return this.loadingTaskId ? this.getAsyncTask(this.loadingTaskId) : null;
      },
    },
    watch: {
      sizeCalculationTask(task) {
        if (task && task.status === 'SUCCESS') {
          this.loading = false;
          this.size = task.result;
        }
      },
    },
    beforeMount() {
      // Proceed to description if no incomplete nodes found
      if (!this.node.error_count) {
        this.step++;
      }
    },
    mounted() {
      this.loading = true;
      // TODO: re-enable when re-added to design
      // // needs ...mapActions('currentChannel', ['loadChannelSize']),
      // this.loadChannelSize(this.rootId).then(response => {
      //   this.size = response.size;
      //   this.loading = response.stale;
      //   this.loadingTaskId = response.changes.length ? response.changes[0].key : null;
      // });
    },
    methods: {
      ...mapActions('currentChannel', ['publishChannel']),
      close() {
        this.publishDescription = '';
        this.dialog = false;
      },
      validate() {
        this.showInvalidText = true;
        return this.isDescriptionValid;
      },
      async handlePublish() {
        if (this.validate()) {
          if (!this.areAllChangesSaved) {
            await forceServerSync();
          }

          this.publishChannel(this.publishDescription).then(this.close);
        }
      },
    },
    $trs: {
      // Incomplete channel window
      incompleteCount: '{count, plural, =1 {# incomplete resource} other {# incomplete resources}}',
      incompleteWarning:
        'Incomplete resources will not be published and made available for download in Kolibri.',
      incompleteInstructions: "Click 'Continue' to confirm that you would like to publish anyway.",
      nextButton: 'Continue',

      // Description + publish
      publishMessageLabel: "Describe what's new in this channel version",
      versionDescriptionLabel: 'Version description',
      descriptionRequiredMessage: "Please describe what's new in this version before publishing",
      descriptionDescriptionTooltip:
        'This description will be shown to Kolibri admins before they update channel versions',
      cancelButton: 'Cancel',
      publishButton: 'Publish',
    },
  };

</script>
