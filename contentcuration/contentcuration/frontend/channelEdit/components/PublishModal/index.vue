<template>

  <div>
    <!--
      STEP 1 of 3: Incomplete resources
      (displayed only when some incomplete resources are found)
    -->
    <KModal
      v-if="step === 0"
      :title="$tr('publishHeader')"
      :submitText="$tr('nextButton')"
      :cancelText="$tr('cancelButton')"
      data-test="incomplete-modal"
      @submit="step++"
      @cancel="close"
    >
      <ChannelMetadata :loading="loadingMetadata" :metadata="channelMetadata" />

      <p class="subheading">
        <Icon color="amber">
          warning
        </Icon>
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
      :title="$tr('publishHeader')"
      :submitText="$tr('publishButton')"
      :cancelText="$tr('cancelButton')"
      data-test="confirm-publish-modal"
      @submit="handlePublish"
      @cancel="close"
    >
      <ChannelMetadata :loading="loadingMetadata" :metadata="channelMetadata" />

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
  import ChannelMetadata from './ChannelMetadata';
  import Languages from 'shared/leUtils/Languages';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { forceServerSync } from 'shared/data/serverSync';

  export default {
    name: 'PublishModal',
    components: {
      ChannelMetadata,
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
        loadingMetadata: false,
        showInvalidText: false, // lazy validation
      };
    },
    computed: {
      ...mapGetters(['areAllChangesSaved']),
      ...mapGetters('currentChannel', ['currentChannel', 'rootId']),
      ...mapGetters('contentNode', ['getContentNode']),
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
      languageName() {
        return Languages.get(this.currentChannel.language).native_name;
      },
      isDescriptionValid() {
        return this.publishDescription && this.publishDescription.trim();
      },
      channelMetadata() {
        return {
          languageName: this.languageName,
          resourceCount: this.node.resource_count,
          size: this.size,
          channelVersion: this.currentChannel.version,
        };
      },
    },
    beforeMount() {
      // Proceed to description if no incomplete nodes found
      if (!this.node.error_count) {
        this.step++;
      }
    },
    mounted() {
      this.loadingMetadata = true;
      this.loadChannelSize(this.rootId).then(size => {
        this.size = size;
        this.loadingMetadata = false;
      });
    },
    methods: {
      ...mapActions('currentChannel', ['loadChannelSize', 'publishChannel']),
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
      publishHeader: 'Publish channel',

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
