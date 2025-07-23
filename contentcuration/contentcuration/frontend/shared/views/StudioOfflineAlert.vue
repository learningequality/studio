<template>
  <KTransition kind="component-vertical-slide-out-in">
    <div v-if="offline && !libraryMode" class="studio-offline-alert"
      :style="computedstyle"
      data-test="studio-offline-alert"
    >
        <KIcon
          icon="disconnected"
          class="kicon-style"
        />
        <span>{{ $tr('offlineText') }}</span>
      </div>
  </KTransition>
</template>

<script>
import { mapState } from 'vuex';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';

export default {
  name: 'StudioOfflineAlert',
  props: {
    offset: {
      type: Number,
      default: 0,
    },
  },
  setup() {
    const { sendPoliteMessage } = useKLiveRegion();
    return { sendPoliteMessage };
  },
  computed: {
  ...mapState({
    offline: state => !state.connection.online,
  }),
  libraryMode() {
    return window.libraryMode;
  },
  computedstyle() {
    return {
      position: 'fixed',
      top: `${this.offset}px`,
      left: '0',
      right: '0',
      backgroundColor: this.$themeTokens.surface,
      zIndex: 16,
    };
  },
  },
  watch: {
    offline(newVal) {
      if (newVal) {
        this.sendPoliteMessage(this.$tr('offlineText'));
      } else {
        this.sendPoliteMessage(this.$tr('onlineText'));
      }
    },
  },
  $trs: {
    offlineText: 'You seem to be offline. Your changes will be saved once your connection is back.',
    onlineText: 'You are back online.',
  },
};
</script>

<style scoped>
.studio-offline-alert {
  width: 100%;
  display: flex;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.kicon-style {
  margin-left: 3px;
  margin-right: 6px;
  flex-shrink: 0;
}


</style>
