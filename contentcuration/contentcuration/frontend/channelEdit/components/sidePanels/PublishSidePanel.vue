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
              :buttonValue="'live'"
              :currentValue="mode"
              @input="mode = 'live'"
            />
            <div class="radio-description">{{ getLiveModeDescription() }}</div>
            
            <!-- Live mode content nested under the radio button -->
            <div v-if="mode === 'live'" class="live-mode-content" style="margin-left: 24px; margin-top: 16px;">
              <div class="info-section">
                <VIconWrapper class="info-icon">info</VIconWrapper>
                <span>{{ publishingInfo$({ version: currentChannel.version, time: formattedPublishTime }) }}</span>
              </div>
              
              <div class="form-section">
                <KTextbox
                  v-model="version_notes"
                  :label="versionNotesLabel$()"
                  :invalid="version_notes.length > 250"
                  :invalidText="maxLengthError$()"
                  :showInvalidText="version_notes.length > 250"
                  textArea
                  :maxlength="250"
                />
              </div>
              
              <!-- Language selector -->
              <div v-if="showLanguageDropdown" class="form-section">
                <KSelect
                  v-model="language"
                  :label="languageLabel$()"
                  :invalid="showLanguageInvalidText"
                  :invalidText="languageRequiredMessage$()"
                  :options="languages"
                  @change="onLanguageChange"
                />
              </div>
              
              <div v-if="incompleteResourcesCount > 0" class="form-section warning-section">
                <div class="warning-content">
                  <VIconWrapper class="warning-icon">warning</VIconWrapper>
                  <div class="warning-text">
                    <div class="warning-title">{{ incompleteResourcesWarning$({ count: incompleteResourcesCount }) }}</div>
                    <div class="warning-description">{{ incompleteResourcesDescription$() }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <KRadioButton
              :label="modeDraft$()"
              :buttonValue="'draft'"
              :currentValue="mode"
              @input="mode = 'draft'"
            />
            <div class="radio-description">{{ modeDraftDescription$() }}</div>
          </KRadioButtonGroup>
        </div>
      </template>

      <template #bottomNavigation>
        <div class="footer">
          <VBtn flat @click="onClose">{{ cancel$() }}</VBtn>
          <VBtn
            color="primary"
            :disabled="submitting"
            @click="submit"
          >
            {{ getButtonText() }}
          </VBtn>
        </div>
      </template>
    </SidePanelModal>
  </div>
</template>

<script>
import { ref, computed, getCurrentInstance, watch, onMounted } from 'vue';
import SidePanelModal from 'shared/views/SidePanelModal';
import VIconWrapper from 'shared/views/VIconWrapper';
import KRadioButtonGroup from 'kolibri-design-system/lib/KRadioButtonGroup';
import KRadioButton from 'kolibri-design-system/lib/KRadioButton';
import KTextbox from 'kolibri-design-system/lib/KTextbox';
import KSelect from 'kolibri-design-system/lib/KSelect';
import { Channel } from 'shared/data/resources';
import { forceServerSync } from 'shared/data/serverSync';
import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
import { LanguagesList } from 'shared/leUtils/Languages';

export default {
  name: 'PublishSidePanel',
  components: { 
    SidePanelModal,
    VIconWrapper,
    KRadioButtonGroup,
    KRadioButton,
    KTextbox,
    KSelect,
  },
  props: {
    open: { type: Boolean, required: true },
    channelId: { type: String, required: true },
  },
  emits: ['close', 'submitted'],
  setup(props, { emit }) {
    const mode = ref('live');
    const version_notes = ref('');
    const submitting = ref(false);
    const language = ref({});
    const showLanguageInvalidText = ref(false);

    const instance = getCurrentInstance();
    const store = instance.proxy.$store;

    const {
      publishToLibrary$,
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

    const formattedPublishTime = computed(() => {
      if (!currentChannel.value) return '';
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const dateString = now.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${timeString} - ${dateString}`;
    });

    const incompleteResourcesCount = computed(() => {
      if (!currentChannel.value) return 0;
      const rootNode = getContentNode.value(currentChannel.value.root_id);
      return rootNode ? rootNode.error_count || 0 : 0;
    });



    const showLanguageDropdown = computed(() => {
      return mode.value === 'live';
    });

    const languages = computed(() => {
      return filterLanguages(() => true);
    });

    const isLanguageValid = computed(() => {
      return Object.keys(language.value).length > 0;
    });

    watch(currentChannel, (newChannel) => {
      if (newChannel) {
        initializeLanguage();
      }
    }, { immediate: true });

    onMounted(() => {
      initializeLanguage();
    });

    const onClose = () => {
      if (!submitting.value) emit('close');
    };

    const submit = async () => {
      try {
        submitting.value = true;
        if (mode.value === 'draft') {
          await Channel.publishDraft(currentChannel.value.id, { use_staging_tree: false });
          await forceServerSync();
          emit('submitted');
          emit('close');
        } else {
          if (language.value && language.value.value && language.value.value !== currentChannel.value?.language) {
            await store.dispatch('channel/updateChannel', {
              id: currentChannel.value.id,
              language: language.value.value,
            });
          }
          
          await Channel.publish(props.channelId, version_notes.value);
          
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
      return mode.value === 'draft' ? publishToLibrary$() : publishChannel$();
    };

    const getLiveModeDescription = () => {
      return modeLiveDescription$();
    };

    const getButtonText = () => {
      return mode.value === 'draft' ? saveDraft$() : publishLive$();
    };

    const onLanguageChange = () => {
      showLanguageInvalidText.value = !isLanguageValid.value;
    };

    const filterLanguages = (filterFn) => {
      return LanguagesList.filter(filterFn).map(l => ({
        value: l.id,
        label: l.native_name,
      }));
    };

    const initializeLanguage = () => {
      if (currentChannel.value?.language) {
        const channelLang = filterLanguages(l => l.id === currentChannel.value.language)[0];
        if (channelLang) {
          language.value = channelLang;
        } else {
          language.value = {
            value: currentChannel.value.language,
            label: currentChannel.value.language
          };
        }
      } else {
        language.value = { value: 'en', label: 'English' };
      }
    };

    return {
      mode,
      version_notes,
      submitting,
      language,
      showLanguageInvalidText,
      
      currentChannel,
      getContentNode,
      formattedPublishTime,
      incompleteResourcesCount,
      showLanguageDropdown,
      languages,
      isLanguageValid,
      
      publishToLibrary$,
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
      
      onClose,
      submit,
      getPanelTitle,
      getLiveModeDescription,
      getButtonText,
      onLanguageChange,
    };
  },
};
</script>

<style scoped>
.form-section { 
  margin: 16px 0; 
}
.label { 
  display: block; 
  font-weight: 600; 
  margin-bottom: 6px; 
}
.footer { 
  display: flex; 
  justify-content: flex-end; 
  gap: 8px; 
  padding: 12px 0; 
}
.radio-description {
  margin-left: 24px;
  margin-bottom: 16px;
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
}
.info-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}
.info-icon {
  color: #1976d2;
}
.warning-section {
  margin-top: 16px;
}
.warning-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
}
.warning-icon {
  color: #f39c12;
  flex-shrink: 0;
  margin-top: 2px;
}
.warning-text {
  flex: 1;
}
.warning-title {
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 8px;
}
.warning-description {
  color: #6c757d;
  line-height: 1.4;
}
</style> 