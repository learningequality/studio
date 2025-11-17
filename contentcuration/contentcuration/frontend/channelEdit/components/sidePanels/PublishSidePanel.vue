<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      closeButtonIconType="close"
      @closePanel="onClose"
    >
      <template #header>
        <h1 class="side-panel-title">{{ getPanelTitle() }}</h1>
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
                      :label="versionDescriptionLabel$()"
                      :invalid="version_notes.length === 0"
                      :invalidText="'Version notes are required'"
                      :showInvalidText="showVersionNotesInvalidText"
                      textArea
                      :maxlength="250"
                      :appearanceOverrides="{ maxWidth: 'none' }"
                      @blur="onVersionNotesBlur"
                    />
                  </div>
                  <!-- Language selector -->
                  <div
                    v-if="showLanguageDropdown"
                    class="form-section"
                  >
                    <KSelect
                      v-model="language"
                      :label="languageLabel$()"
                      :invalid="showLanguageInvalidText"
                      :invalidText="languageRequiredMessage$()"
                      :options="languages"
                      @change="onLanguageChange"
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
            :disabled="submitting || checkingResubmit || !isFormValid"
            @click="submit"
          >
            <span
              v-if="checkingResubmit"
              class="loader-wrapper"
            >
              <KCircularLoader :size="16" />
            </span>
            <span v-else>{{ submitText }}</span>
          </KButton>
        </div>
      </template>
    </SidePanelModal>
  </div>

</template>


<script>

  import { ref, computed, getCurrentInstance, onMounted } from 'vue';
  import SidePanelModal from 'shared/views/SidePanelModal';
  import { Channel, CommunityLibrarySubmission } from 'shared/data/resources';
  import { forceServerSync } from 'shared/data/serverSync';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { LanguagesList } from 'shared/leUtils/Languages';

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
      const submitting = ref(false);
      const checkingResubmit = ref(false);
      const language = ref({});
      const showLanguageInvalidText = ref(false);
      const showVersionNotesInvalidText = ref(false); // lazy validation
      const channelLanguages = ref([]);
      const channelLanguageExists = ref(true);

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
        const channelLanguageExists = currentChannel.value.language;

        return ((isCheffedChannel || isPrivateChannel) && isFirstPublish) || !channelLanguageExists;
      });

      const languages = computed(() => {
        if (!currentChannel.value) return [];
        return filterLanguages(l => channelLanguages.value.includes(l.id));
      });

      const defaultLanguage = computed(() => {
        if (!currentChannel.value?.language) return {};
        const channelLang = filterLanguages(l => l.id === currentChannel.value.language)[0];
        return languages.value.some(lang => lang.value === channelLang?.value) ? channelLang : {};
      });

      const isLanguageValid = computed(() => {
        return Object.keys(language.value).length > 0;
      });

      const isVersionNotesValid = computed(() => {
        return version_notes.value.length > 0;
      });

      // Validate the version and language for live mode
      const isFormValid = computed(() => {
        if (mode.value === PublishModes.LIVE) {
          const versionNotesValid = isVersionNotesValid.value;
          const languageValid = showLanguageDropdown.value ? isLanguageValid.value : true;
          return versionNotesValid && languageValid;
        }
        return true;
      });

      const submitText = computed(() => {
        return mode.value === PublishModes.DRAFT ? saveDraft$() : publishAction$();
      });

      const filterLanguages = filterFn => {
        return LanguagesList.filter(filterFn).map(l => ({
          value: l.id,
          label: l.native_name,
        }));
      };

      // Validate the selected language when it changes
      const validateSelectedLanguage = () => {
        if (Object.keys(language.value).length > 0 && languages.value.length > 0) {
          const isValidLanguage = languages.value.some(lang => lang.value === language.value.value);
          if (!isValidLanguage) {
            language.value = {};
          }
        }
      };

      onMounted(async () => {
        if (currentChannel.value) {
          const exists = await channelLanguageExistsInResources();
          channelLanguageExists.value = exists;

          if (!exists) {
            const languages = await getLanguagesInChannelResources();
            channelLanguages.value = languages.length ? languages : [currentChannel.value.language];
            language.value = defaultLanguage.value;
            validateSelectedLanguage();
          } else {
            channelLanguages.value = [currentChannel.value.language];
            language.value = defaultLanguage.value;
            validateSelectedLanguage();
          }
        }
      });

      const onClose = () => {
        if (!submitting.value) emit('close');
      };

      const submit = async () => {
        // Validate form before submission
        if (!validate()) {
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
            if (
              language.value &&
              language.value.value &&
              language.value.value !== currentChannel.value?.language
            ) {
              await store.dispatch('channel/updateChannel', {
                id: currentChannel.value.id,
                language: language.value.value,
              });
            }

            await Channel.publish(currentChannel.value.id, version_notes.value);

            emit('published', { channelId: currentChannel.value.id });

            if (mode.value === PublishModes.LIVE) {
              checkingResubmit.value = true;
              try {
                const response = await CommunityLibrarySubmission.fetchCollection({
                  channel: currentChannel.value.id,
                  max_results: 1,
                });

                const submissions = response?.results || [];

                if (submissions.length > 0) {
                  const latestSubmission = submissions[0];
                  emit('showResubmitCommunityLibraryModal', {
                    channel: currentChannel.value ? { ...currentChannel.value } : null,
                    latestSubmissionVersion: latestSubmission?.channel_version ?? null,
                  });
                }
              } catch (error) {
                store.dispatch('shared/handleAxiosError', error);
              } finally {
                checkingResubmit.value = false;
                submitting.value = false;
              }
            } else {
              submitting.value = false;
            }

            emit('close');
          }
        } catch (error) {
          store.dispatch('shared/handleAxiosError', error);
          submitting.value = false;
        }
      };

      const getPanelTitle = () => {
        return publishChannel$();
      };

      const onLanguageChange = () => {
        showLanguageInvalidText.value = !isLanguageValid.value;
        validateSelectedLanguage(); // Ensure language is always valid
      };

      const onVersionNotesBlur = () => {
        showVersionNotesInvalidText.value = !isVersionNotesValid.value;
      };

      const validate = () => {
        if (mode.value === PublishModes.DRAFT) {
          // For draft mode, no validation is required
          return true;
        } else {
          // For live mode, validate version notes and language
          showVersionNotesInvalidText.value = !isVersionNotesValid.value;
          showLanguageInvalidText.value = !isLanguageValid.value;
          return !showVersionNotesInvalidText.value && !showLanguageInvalidText.value;
        }
      };

      return {
        PublishModes,
        mode,
        version_notes,
        submitting,
        checkingResubmit,
        language,
        showLanguageInvalidText,
        showVersionNotesInvalidText,

        currentChannel,
        incompleteResourcesCount,
        showLanguageDropdown,
        languages,
        isFormValid,
        submitText,

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

        onClose,
        submit,
        getPanelTitle,
        onLanguageChange,
        onVersionNotesBlur,
      };
    },

    emits: ['close', 'published', 'showResubmitCommunityLibraryModal'],
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
