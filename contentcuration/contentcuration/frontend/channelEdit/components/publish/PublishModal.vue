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

      <!-- Setting the height is a temporal fix for -->
      <!-- https://github.com/learningequality/kolibri-design-system/issues/324 -->
      <!-- Should be removed after it is fixed -->
      <KFixedGrid :numCols="12" style="height: 200px;">
        <KGridItem :layout="{ span: 11 }">
          <KTextbox
            v-model="publishDescription"
            :label="$tr('versionDescriptionLabel')"
            :invalid="!isDescriptionValid"
            :invalidText="$tr('descriptionRequiredMessage')"
            :showInvalidText="showDescriptionInvalidText"
            autofocus
            textArea
          />
        </KGridItem>
        <KGridItem :layout="{ span: 1 }">
          <HelpTooltip :text="$tr('descriptionDescriptionTooltip')" bottom />
        </KGridItem>

        <KGridItem v-show="showLanguageDropdown" :layout="{ span: 11 }">
          <KSelect
            v-model="language"
            :label="$tr('languageLabel')"
            :invalid="showLanguageInvalidText"
            :invalidText="$tr('languageRequiredMessage')"
            :options="languages"
            @change="showLanguageInvalidText = !isLanguageValid"
          />
        </KGridItem>
        <KGridItem v-show="showLanguageDropdown" :layout="{ span: 1 }">
          <HelpTooltip :text="$tr('languageDescriptionTooltip')" bottom />
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
  import { LanguagesList } from 'shared/leUtils/Languages';

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
        showDescriptionInvalidText: false, // lazy validation
        showLanguageInvalidText: false,
        loading: false,
        loadingTaskId: null,
        language: {},
        channelLanguages: [],
        channelLanguageExists: true,
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
      isLanguageValid() {
        return Object.keys(this.language).length > 0;
      },
      sizeCalculationTask() {
        return this.loadingTaskId ? this.getAsyncTask(this.loadingTaskId) : null;
      },
      isCheffedChannel() {
        return Boolean(this.currentChannel.ricecooker_version);
      },
      isPrivateChannel() {
        return this.currentChannel.public;
      },
      isFirstPublish() {
        return this.currentChannel.version === 0;
      },
      defaultLanguage() {
        const channelLang = this.filterLanguages(l => l.id === this.currentChannel.language)[0];
        return this.languages.some(lang => lang.value === channelLang.value) ? channelLang : {};
      },
      showLanguageDropdown() {
        return (
          ((this.isCheffedChannel || this.isPrivateChannel) && this.isFirstPublish) ||
          !this.channelLanguageExists
        );
      },
      languages() {
        return this.filterLanguages(l => this.channelLanguages.includes(l.id));
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
      this.channelLanguageExistsInResources().then(exists => {
        this.channelLanguageExists = exists;
        if (!exists) {
          this.getLanguagesInChannelResources().then(languages => {
            this.channelLanguages = languages.length ? languages : [this.currentChannel.language];
            this.language = this.defaultLanguage;
          });
        } else {
          this.channelLanguages = [this.currentChannel.language];
          this.language = this.defaultLanguage;
        }
      });
    },
    methods: {
      ...mapActions('channel', ['updateChannel']),
      ...mapActions('currentChannel', [
        'publishChannel',
        'channelLanguageExistsInResources',
        'getLanguagesInChannelResources',
      ]),
      close() {
        this.publishDescription = '';
        this.language = this.defaultLanguage;
        this.dialog = false;
      },
      validate() {
        this.showDescriptionInvalidText = !this.isDescriptionValid;
        this.showLanguageInvalidText = !this.isLanguageValid;
        return !this.showDescriptionInvalidText && !this.showLanguageInvalidText;
      },
      async handlePublish() {
        if (this.validate()) {
          if (!this.areAllChangesSaved) {
            await forceServerSync();
          }

          this.updateChannel({
            id: this.currentChannel.id,
            language: this.language.value,
          }).then(() => {
            this.publishChannel(this.publishDescription).then(this.close);
          });
        }
      },
      filterLanguages(filterFn) {
        return LanguagesList.filter(filterFn).map(l => ({
          value: l.id,
          label: l.native_name,
        }));
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
      languageDescriptionTooltip: 'The default language for a channel and its resources',
      cancelButton: 'Cancel',
      publishButton: 'Publish',
      languageLabel: 'Language',
      languageRequiredMessage: 'Please select a language for this channel',
    },
  };

</script>
