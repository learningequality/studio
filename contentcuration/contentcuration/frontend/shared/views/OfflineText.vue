<template>

  <VFadeTransition
    v-if="offline && !libraryMode"
    data-test="text"
  >
    <VTooltip
      v-if="indicator"
      bottom
      z-index="300"
      lazy
    >
      <template #activator="{ on }">
        <div
          class="px-4"
          v-on="on"
        >
          <Icon
            class="mx-2"
            icon="disconnected"
          />
          <span class="font-weight-bold">
            {{ $tr('offlineIndicatorText') }}
          </span>
        </div>
      </template>
      <span>{{ offlineText || $tr('offlineText') }}</span>
    </VTooltip>
    <ToolBar
      v-else-if="toolbar"
      color="white"
      dense
      flat
      fixed
      clipped-left
      clipped-right
      :style="`margin-top: ${offset}px;`"
      v-bind="$attrs"
    >
      <Icon
        class="mx-3"
        icon="disconnected"
      />
      <span>{{ offlineText || $tr('offlineText') }}</span>
    </ToolBar>
    <div v-else>
      <Icon
        class="mx-3"
        icon="disconnected"
      />
      <span>{{ offlineText || $tr('offlineText') }}</span>
    </div>
  </VFadeTransition>

</template>


<script>

  import { mapState } from 'vuex';
  import ToolBar from './ToolBar';

  export default {
    name: 'OfflineText',
    components: {
      ToolBar,
    },
    props: {
      indicator: {
        type: Boolean,
        default: false,
      },
      toolbar: {
        type: Boolean,
        default: false,
      },
      offset: {
        type: Number,
        default: 0,
      },
      offlineText: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      libraryMode() {
        return window.libraryMode;
      },
    },
    $trs: {
      offlineIndicatorText: 'Offline',
      offlineText:
        'You seem to be offline. Your changes will be saved once your connection is back.',
    },
  };

</script>


<style scoped>

  span {
    vertical-align: bottom;
  }

</style>
