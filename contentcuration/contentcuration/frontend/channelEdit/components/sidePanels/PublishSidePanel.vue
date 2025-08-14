<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      closeButtonIconType="close"
      @closePanel="onClose"
    >
      <template #header>
        <h1 style="margin: 0">{{ getPanelTitle() }}</h1>
      </template>

      <template #default>
        <div class="form-section">
          <KRadioButtonGroup>
            <KRadioButton
              :label="modeLive$()"
              :buttonValue="PublishModes.LIVE"
              :currentValue="mode"
              @input="mode = PublishModes.LIVE"
            />
            <div
              class="radio-description"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ modeLiveDescription$() }}
            </div>

            <!-- Live mode content nested under the radio button -->
            <div
              v-if="mode === PublishModes.LIVE"
              class="live-mode-content"
              style="margin-top: 16px; margin-left: 24px"
            >
              <div
                class="info-section"
                :style="{
                  backgroundColor: $themeTokens.surface,
                  border: `1px solid ${$themeTokens.outline}`,
                }"
              >
                <KIcon
                  icon="info"
                  :style="{ color: $themeTokens.primary }"
                />
                <span>{{
                  publishingInfo$({
                    version: currentChannel.version + 1,
                    time: formattedPublishTime,
                  })
                }}</span>
              </div>

              <div class="form-section">
                <KTextbox
                  v-model="version_notes"
                  :label="versionNotesLabel$()"
                  :invalid="version_notes.length === 0 || version_notes.length > 250"
                  :invalidText="
                    version_notes.length === 0 ? 'Version notes are required' : maxLengthError$()
                  "
                  :showInvalidText="version_notes.length === 0 || version_notes.length > 250"
                  textArea
                  :maxlength="250"
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

              <div
                v-if="incompleteResourcesCount > 0"
                class="form-section warning-section"
              >
                <div
                  class="warning-content"
                  :style="{
                    backgroundColor: $themeTokens.warning,
                    border: `1px solid ${$themeTokens.warningOutline}`,
                  }"
                >
                  <KIcon
                    icon="warning"
                    :style="{ color: $themeTokens.warningText }"
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
                      :style="{ color: $themeTokens.annotation }"
                    >
                      {{ incompleteResourcesDescription$() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <KRadioButton
              :label="modeDraft$()"
              :buttonValue="PublishModes.DRAFT"
              :currentValue="mode"
              @input="mode = PublishModes.DRAFT"
            />
            <div
              class="radio-description"
              :style="{ color: $themeTokens.annotation }"
            >
              {{ modeDraftDescription$() }}
            </div>
          </KRadioButtonGroup>
        </div>
      </template>

      <template #bottomNavigation>
        <div class="footer">
          <KButton
            flat
            @click="onClose"
          >
            {{ cancel$() }}
          </KButton>
          <KButton
            color="primary"
            :disabled="submitting || !isFormValid"
            @click="submit"
          >
            {{ buttonText }}
          </KButton>
        </div>
      </template>
    </SidePanelModal>
  </div>

</template>


<script>

  import { ref, computed, getCurrentInstance, onMounted } from 'vue';
  import SidePanelModal from 'shared/views/SidePanelModal';
  import { Channel } from 'shared/data/resources';
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
      const language = ref({});
      const showLanguageInvalidText = ref(false);
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
        publishLive$,
        saveDraft$,
        modeLive$,
        modeDraft$,
        versionNotesLabel$,
        modeLiveDescription$,
        modeDraftDescription$,
        publishingInfo$,
        incompleteResourcesWarning$,
        incompleteResourcesDescription$,
        maxLengthError$,
        cancel$,
        languageLabel$,
        languageRequiredMessage$,
      } = communityChannelsStrings;

      const currentChannel = computed(() => store.getters['currentChannel/currentChannel']);
      const getContentNode = computed(() => store.getters['contentNode/getContentNode']);
      const areAllChangesSaved = computed(() => store.getters['areAllChangesSaved']);

      const formattedPublishTime = computed(() => {
        if (!currentChannel.value) return '';
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const dateString = now.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        });
        return `${timeString} - ${dateString}`;
      });

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

      const isLanguageValid = computed(() => {
        return Object.keys(language.value).length > 0;
      });

      // Validate the version and language for live mode
      const isFormValid = computed(() => {
        if (mode.value === PublishModes.LIVE) {
          const versionNotesValid =
            version_notes.value.length > 0 && version_notes.value.length <= 250;
          const languageValid = showLanguageDropdown.value ? isLanguageValid.value : true;
          return versionNotesValid && languageValid;
        }
        return true;
      });

      const buttonText = computed(() => {
        return mode.value === PublishModes.DRAFT ? saveDraft$() : publishLive$();
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

      onMounted(() => {
        if (currentChannel.value) {
          channelLanguageExistsInResources().then(exists => {
            channelLanguageExists.value = exists;
            if (!exists) {
              getLanguagesInChannelResources().then(languages => {
                channelLanguages.value = languages.length
                  ? languages
                  : [currentChannel.value.language];
                // Set language and validate
                if (currentChannel.value.language) {
                  const channelLang = languages.value.find(
                    l => l.value === currentChannel.value.language,
                  );
                  language.value = channelLang || {};
                } else {
                  language.value = {};
                }
                validateSelectedLanguage();
              });
            } else {
              channelLanguages.value = [currentChannel.value.language];
              // Set language and validate
              if (currentChannel.value.language) {
                const channelLang = languages.value.find(
                  l => l.value === currentChannel.value.language,
                );
                language.value = channelLang || {};
              } else {
                language.value = {};
              }
              validateSelectedLanguage();
            }
          });
        }
      });

      const onClose = () => {
        if (!submitting.value) emit('close');
      };

      const submit = async () => {
        // Prevent submission if form is invalid
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
            emit('submitted');
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

            await Channel.publish(props.channelId, version_notes.value, language.value.value);

            emit('submitted');
            emit('close');
          }
        } catch (error) {
          store.dispatch('shared/handleAxiosError', error);
        } finally {
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

      return {
        PublishModes,
        mode,
        version_notes,
        submitting,
        language,
        showLanguageInvalidText,

        currentChannel,
        formattedPublishTime,
        incompleteResourcesCount,
        showLanguageDropdown,
        languages,
        isFormValid,
        buttonText,

        modeLive$,
        modeDraft$,
        versionNotesLabel$,
        modeLiveDescription$,
        modeDraftDescription$,
        publishingInfo$,
        incompleteResourcesWarning$,
        incompleteResourcesDescription$,
        maxLengthError$,
        cancel$,
        languageLabel$,
        languageRequiredMessage$,

        onClose,
        submit,
        getPanelTitle,
        onLanguageChange,
      };
    },
    props: {
      channelId: { type: String, required: true },
    },
    emits: ['close', 'submitted'],
  };

</script>


<style scoped>

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
    gap: 8px;
    justify-content: flex-end;
    padding: 12px 0;
  }

  .radio-description {
    margin-bottom: 16px;
    margin-left: 24px;
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
    border-radius: 8px;
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
