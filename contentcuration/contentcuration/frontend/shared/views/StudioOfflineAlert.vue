<template>

  <KTransition kind="component-vertical-slide-out-in">
    <div
      v-if="offline && !libraryMode"
      class="studio-offline-alert"
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
    setup() {
      const { sendPoliteMessage } = useKLiveRegion();
      return { sendPoliteMessage };
    },
    props: {
      offset: {
        type: Number,
        default: 0,
      },
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
      offlineText:
        'You seem to be offline. Your changes will be saved once your connection is back.',
      onlineText: 'You are back online.',
    },
  };

</script>


<style scoped>

  .studio-offline-alert {
    display: flex;
    width: 100%;
    padding: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .kicon-style {
    flex-shrink: 0;
    margin-right: 6px;
    margin-left: 3px;
  }

</style>
