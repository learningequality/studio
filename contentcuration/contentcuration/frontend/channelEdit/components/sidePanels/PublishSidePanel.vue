<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      closeButtonIconType="close"
      @closePanel="onClose"
    >
      <template #header>
        <h1 class="side-panel-title">{{ publishChannel$() }}</h1>
      </template>

      <template #default>
        <div>
          <KRadioButtonGroup>
            <KRadioButton
              :label="modeLive$()"
              :buttonValue="PublishModes.LIVE"
              :currentValue="mode"
              :description="modeLiveDescription$()"
              @input="mode = PublishModes.LIVE"
            />

            <!-- Live mode content nested under the radio button -->
            <div
              v-if="mode === PublishModes.LIVE"
              class="live-mode-content"
              style="margin-top: 16px; margin-left: 24px"
            >
              <div class="live-publish-info">
                <KIcon
                  class="info-icon"
                  icon="infoOutline"
                />
                <div class="version-notes-wrapper">
                  <div class="version-info">
                    {{
                      publishingInfo$({
                        version: currentChannel.version + 1,
                      })
                    }}
                  </div>

                  <div class="version-notes-description">
                    {{ versionNotesLabel$() }}
                  </div>

                  <div class="form-section">
                    <KTextbox
                      v-model="version_notes"
                      showInvalidText
                      :label="versionDescriptionLabel$()"
                      :invalid="isVersionNotesBlurred && !isVersionNotesValid"
                      :invalidText="versionNotesRequiredMessage$()"
                      textArea
                      :maxlength="250"
                      :appearanceOverrides="{ maxWidth: 'none' }"
                      @blur="isVersionNotesBlurred = true"
                    />
                  </div>
                  <!-- Language selector -->
                  <KCircularLoader v-if="isChannelLanguageLoading" />
                  <div
                    v-else-if="showLanguageDropdown"
                    class="form-section"
                  >
                    <KSelect
                      v-model="newChannelLanguage"
                      :label="languageLabel$()"
                      :invalid="isLanguageSelectBlurred && !isNewLanguageValid"
                      :invalidText="languageRequiredMessage$()"
                      :options="languageOptions"
                      @blur="isLanguageSelectBlurred = true"
                    />
                  </div>
                </div>
              </div>

              <div
                v-if="incompleteResourcesCount > 0"
                class="form-section warning-section"
              >
                <div
                  class="warning-content"
                  :style="{
                    backgroundColor: $themePalette.yellow.v_100,
                    borderRadius: '4px',
                  }"
                >
                  <KIcon
                    icon="warning"
                    style="font-size: 20px"
                    :color="$themePalette.yellow.v_500"
                  />
                  <div class="warning-text">
                    <div
                      class="warning-title"
                      :style="{ color: $themeTokens.error }"
                    >
                      {{ incompleteResourcesWarning$({ count: incompleteResourcesCount }) }}
                    </div>
                    <div
                      class="warning-description"
                      :style="{ color: $themePalette.grey.v_800 }"
                    >
                      {{ incompleteResourcesDescription1$() }}
                    </div>
                    <div
                      class="warning-description"
                      :style="{
                        color: $themePalette.grey.v_800,
                        marginTop: '16px',
                      }"
                    >
                      {{ incompleteResourcesDescription2$() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <KRadioButton
              :label="modeDraft$()"
              :buttonValue="PublishModes.DRAFT"
              :currentValue="mode"
              :description="modeDraftDescription$()"
              @input="mode = PublishModes.DRAFT"
            />
          </KRadioButtonGroup>
        </div>
      </template>

      <template #bottomNavigation>
        <div class="footer">
          <KButton @click="onClose">
            {{ cancelAction$() }}
          </KButton>
          <KButton
            primary
            :disabled="submitting || !isFormValid"
            @click="submit"
          >
            {{ submitText }}
          </KButton>
        </div>
      </template>
    </SidePanelModal>
  </div>

</template>


<script>

  import { ref, computed, getCurrentInstance } from 'vue';
  import SidePanelModal from 'shared/views/SidePanelModal';
  import { Channel, CommunityLibrarySubmission } from 'shared/data/resources';
  import { forceServerSync } from 'shared/data/serverSync';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { LanguagesList } from 'shared/leUtils/Languages';
  import logging from 'shared/logging';

  export default {
    name: 'PublishSidePanel',
    components: {
      SidePanelModal,
    },
    setup(props, { emit }) {
      const PublishModes = {
        LIVE: 'live',
        DRAFT: 'draft',
      };

      const mode = ref(PublishModes.LIVE);
      const version_notes = ref('');
      const newChannelLanguage = ref({});
      const languageOptions = ref(null);

      const isChannelLanguageLoading = ref(false);
      const submitting = ref(false);
      const isVersionNotesBlurred = ref(false);
      const isLanguageSelectBlurred = ref(false);
      const isCurrentChannelLanguageValid = ref(false);

      const instance = getCurrentInstance();
      const store = instance.proxy.$store;

      const channelLanguageExistsInResources = () =>
        store.dispatch('currentChannel/channelLanguageExistsInResources');
      const getLanguagesInChannelResources = () =>
        store.dispatch('currentChannel/getLanguagesInChannelResources');

      const {
        publishChannel$,
        publishAction$,
        saveDraft$,
        modeLive$,
        modeDraft$,
        versionNotesLabel$,
        modeLiveDescription$,
        modeDraftDescription$,
        publishingInfo$,
        versionDescriptionLabel$,
        incompleteResourcesWarning$,
        incompleteResourcesDescription1$,
        incompleteResourcesDescription2$,
        cancelAction$,
        languageLabel$,
        languageRequiredMessage$,
        versionNotesRequiredMessage$,
      } = communityChannelsStrings;

      const currentChannel = computed(() => store.getters['currentChannel/currentChannel']);
      const getContentNode = computed(() => store.getters['contentNode/getContentNode']);
      const areAllChangesSaved = computed(() => store.getters['areAllChangesSaved']);

      const incompleteResourcesCount = computed(() => {
        if (!currentChannel.value) return 0;
        const rootNode = getContentNode.value(currentChannel.value.root_id);
        return rootNode?.error_count || 0;
      });

      const showLanguageDropdown = computed(() => {
        if (!currentChannel.value) return false;

        const isCheffedChannel = Boolean(currentChannel.value.ricecooker_version);
        const isPrivateChannel = currentChannel.value.public === false;
        const isFirstPublish = currentChannel.value.version === 0;

        if (isFirstPublish) {
          return isCheffedChannel || isPrivateChannel;
        }
        return !isCurrentChannelLanguageValid.value;
      });

      const isNewLanguageValid = computed(() => {
        // If language selector is not shown do not prevent submission
        if (!showLanguageDropdown.value) return true;
        return Object.keys(newChannelLanguage.value).length > 0;
      });

      const isVersionNotesValid = computed(() => {
        return version_notes.value.length > 0;
      });

      // Validate the version and language for live mode
      const isFormValid = computed(() => {
        if (mode.value === PublishModes.LIVE) {
          return isVersionNotesValid.value && isNewLanguageValid.value;
        }
        return true;
      });

      const submitText = computed(() => {
        return mode.value === PublishModes.DRAFT ? saveDraft$() : publishAction$();
      });

      const getLanguagesOptions = languages => {
        return mapLanguagesOptions(LanguagesList.filter(lang => languages.includes(lang.id)));
      };
      const mapLanguagesOptions = languages => {
        return languages.map(l => ({
          value: l.id,
          label: l.native_name,
        }));
      };

      /**
       * Makes sure that the channel.language is consistent with the channel resources languages
       * If not, show the language selector for the user to select a valid language for the channel
       */
      const _auditChannelLanguage = async () => {
        if (!currentChannel.value) {
          return;
        }

        const currentChannelLanguage = currentChannel.value.language;
        // If the current `channel.language` exists among its resources languages,
        // the channel language is valid
        isCurrentChannelLanguageValid.value = await channelLanguageExistsInResources();
        const channelLanguageOption = getLanguagesOptions([currentChannelLanguage])[0];

        if (!isCurrentChannelLanguageValid.value || !channelLanguageOption) {
          // If not valid, or it doesn't exist in our LanguagesList, load resources languages
          const resourcesLanguages = await getLanguagesInChannelResources();
          if (resourcesLanguages.length > 0) {
            languageOptions.value = getLanguagesOptions(resourcesLanguages);
            return;
          }
        }

        // if not found in LanguagesList and no resources languages found, set the whole
        // LanguagesList as options
        if (!channelLanguageOption) {
          languageOptions.value = mapLanguagesOptions(LanguagesList);
          return;
        }
        // In any other case, just set the channel language as the only option
        languageOptions.value = [channelLanguageOption];
        newChannelLanguage.value = channelLanguageOption;
      };

      const auditChannelLanguage = async () => {
        isChannelLanguageLoading.value = true;
        await _auditChannelLanguage();
        isChannelLanguageLoading.value = false;
      };

      auditChannelLanguage();

      const onClose = () => {
        if (!submitting.value) emit('close');
      };

      const checkResubmitToCommunityLibrary = async () => {
        if (mode.value !== PublishModes.LIVE) {
          return;
        }

        try {
          const response = await CommunityLibrarySubmission.fetchCollection({
            channel: currentChannel.value.id,
            max_results: 1,
          });

          const submissions = response?.results || [];

          if (submissions.length > 0) {
            const latestSubmission = submissions[0];
            emit('showResubmitCommunityLibraryModal', {
              channel: { ...currentChannel.value },
              latestSubmissionVersion: latestSubmission.channel_version,
            });
          }
        } catch (error) {
          // Log the error but do not block the publish flow
          logging.error(error);
        }
      };

      const submit = async () => {
        // Should not get here if the form is invalid, but just in case
        if (!isFormValid.value) {
          return;
        }

        try {
          submitting.value = true;

          // Check if we need to sync unsaved changes for both modes
          if (!areAllChangesSaved.value) {
            await forceServerSync();
          }

          if (mode.value === PublishModes.DRAFT) {
            await Channel.publishDraft(currentChannel.value.id, { use_staging_tree: false });
            emit('close');
          } else {
            // `newChannelLanguage.value` is a KSelect option { value, label }, so we need to
            // extract its `value` to get the language code
            if (newChannelLanguage.value.value !== currentChannel.value.language) {
              await store.dispatch('channel/updateChannel', {
                id: currentChannel.value.id,
                language: newChannelLanguage.value.value,
              });
            }

            await Channel.publish(currentChannel.value.id, version_notes.value);

            await checkResubmitToCommunityLibrary();

            emit('close');
          }
        } catch (error) {
          store.dispatch('errors/handleAxiosError', error);
        } finally {
          submitting.value = false;
        }
      };

      return {
        isChannelLanguageLoading,
        PublishModes,
        mode,
        version_notes,
        submitting,
        languageOptions,
        newChannelLanguage,
        isVersionNotesBlurred,
        isLanguageSelectBlurred,

        currentChannel,
        incompleteResourcesCount,
        showLanguageDropdown,
        isFormValid,
        isNewLanguageValid,
        isVersionNotesValid,
        submitText,

        modeLive$,
        modeDraft$,
        publishChannel$,
        versionNotesLabel$,
        modeLiveDescription$,
        modeDraftDescription$,
        publishingInfo$,
        versionDescriptionLabel$,
        incompleteResourcesWarning$,
        incompleteResourcesDescription1$,
        incompleteResourcesDescription2$,
        cancelAction$,
        languageLabel$,
        languageRequiredMessage$,
        versionNotesRequiredMessage$,

        onClose,
        submit,
      };
    },

    emits: ['close', 'showResubmitCommunityLibraryModal'],
  };

</script>


<style scoped lang="scss">

  .side-panel-title {
    margin: 0;
    font-size: 20px;
  }

  .live-publish-info {
    display: flex;
    gap: 8px;

    .info-icon {
      font-size: 20px;
    }

    .version-notes-wrapper {
      width: 100%;

      .version-info {
        margin-top: 2px;
      }

      .version-notes-description {
        margin-top: 8px;
      }
    }
  }

  .form-section {
    margin: 16px 0;
  }

  .label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
  }

  .footer {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    width: 100%;
  }

  .info-section {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px;
    border-radius: 4px;
  }

  .warning-section {
    margin-top: 16px;
  }

  .warning-content {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
  }

  .warning-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .warning-text {
    flex: 1;
  }

  .warning-title {
    margin-bottom: 8px;
    font-weight: bold;
  }

  .warning-description {
    line-height: 1.4;
  }

</style>
