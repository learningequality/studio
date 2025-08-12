<template>
  <div>
    <SidePanelModal
      alignment="right"
      :ariaLabel="$tr('publishPanelAria')"
      @keyup.esc="onClose"
      @closePanel="onClose"
    >
      <template #header>
        <h2 style="margin: 0">{{ getPanelTitle() }}</h2>
      </template>

      <template #default>
        <div class="form-section">
          <VRadioGroup v-model="mode">
            <VRadio
              :label="$tr('modeLive')"
              value="live"
            />
            <div class="radio-description">{{ getLiveModeDescription() }}</div>
            
            <!-- Live mode content nested under the radio button -->
            <div v-if="mode === 'live'" class="live-mode-content" style="margin-left: 24px; margin-top: 16px;">
              <div class="info-section">
                <VIconWrapper class="info-icon">info</VIconWrapper>
                <span>{{ $tr('publishingInfo', { version: currentChannel.version, time: formattedPublishTime }) }}</span>
              </div>
              
              <div class="form-section">
                <label class="label">{{ $tr('versionNotesLabel') }}</label>
                <VTextarea
                  :label="$tr('versionNotesLabel')"
                  :rows="4"
                  v-model="version_notes"
                  :counter="30"
                  :rules="[v => v.length <= 30 || $tr('maxLengthError')]"
                  box
                />
              </div>
              
              <div v-if="incompleteResourcesCount > 0" class="form-section warning-section">
                <div class="warning-content">
                  <VIconWrapper class="warning-icon">warning</VIconWrapper>
                  <div class="warning-text">
                    <div class="warning-title">{{ $tr('incompleteResourcesWarning', { count: incompleteResourcesCount }) }}</div>
                    <div class="warning-description">{{ $tr('incompleteResourcesDescription') }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <VRadio
              :label="$tr('modeDraft')"
              value="draft"
            />
            <div class="radio-description">{{ $tr('modeDraftDescription') }}</div>
          </VRadioGroup>
        </div>
      </template>

      <template #bottomNavigation>
        <div class="footer">
          <VBtn flat @click="onClose">{{ $tr('cancel') }}</VBtn>
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
import SidePanelModal from 'shared/views/SidePanelModal';
import VIconWrapper from 'shared/views/VIconWrapper';
import { Channel } from 'shared/data/resources';
import { forceServerSync } from 'shared/data/serverSync';

import { mapGetters } from 'vuex';

export default {
  name: 'PublishSidePanel',
  components: { 
    SidePanelModal,
    VIconWrapper,
  },
  props: {
    open: { type: Boolean, required: true },
    channelId: { type: String, required: true },
  },
  emits: ['close', 'submitted'],
  data() {
    return {
      mode: 'live',
      version_notes: '',
      submitting: false,
    };
  },
  computed: {
    ...mapGetters('currentChannel', ['currentChannel']),
    ...mapGetters('contentNode', ['getContentNode']),
    formattedPublishTime() {
      if (!this.currentChannel) return '';
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
    },
    incompleteResourcesCount() {
      if (!this.currentChannel) return 0;
      const rootNode = this.getContentNode(this.currentChannel.root_id);
      return rootNode ? rootNode.error_count || 0 : 0;
    },
  },
  methods: {
    onClose() {
      if (!this.submitting) this.$emit('close');
    },
    async submit() {
      try {
        this.submitting = true;
        if (this.mode === 'draft') {
          await Channel.publishDraft(this.currentChannel.id, { use_staging_tree: false });
          await forceServerSync();
          this.$emit('submitted');
          this.$emit('close');
        } else {
          await Channel.publish(this.channelId, {
            version_notes: this.version_notes,
          });
          this.$emit('submitted');
          this.$emit('close');
        }
      } catch (error) {
        this.$store.dispatch('shared/handleAxiosError', error);
      } finally {
        this.submitting = false;
      }
    },
    getPanelTitle() {
      return this.mode === 'draft' ? this.$tr('publishToLibrary') : this.$tr('publishChannel');
    },
    getLiveModeDescription() {
      return this.$tr('modeLiveDescription');
    },
    getButtonText() {
      return this.mode === 'draft' ? this.$tr('saveDraft') : this.$tr('publishLive');
    },
  },
  $trs: {
    publishToLibrary: 'Publish to library',
    publishChannel: 'Publish channel',
    publishPanelAria: 'Publish channel side panel',
    publishLive: 'PUBLISH',
    saveDraft: 'SAVE DRAFT',
    modeLive: 'Live',
    modeDraft: 'Draft (staging)',
    versionNotesLabel: 'Describe what\'s new in this channel version',
    cancel: 'CANCEL',
    modeLiveDescription: 'This edition will be accessible to the public through the Kolibri public library.',
    modeDraftDescription: 'Your channel will be saved as a draft, allowing you to review or conduct quality checks without altering the published version on Kolibri public library.',
    publishingInfo: 'You\'re publishing: Version {version} ({time})',
    incompleteResourcesWarning: '{count} incomplete resources.',
    incompleteResourcesDescription: 'Incomplete resources will not be published and made available for download in Kolibri. Click \'Publish\' to confirm that you would like to publish anyway.',
    maxLengthError: 'Maximum 30 characters allowed',
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
