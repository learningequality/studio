<template>

  <div v-if="offline && !libraryMode">
    <VTooltip v-if="indicator" bottom>
      <template v-slot:activator="{ on }">
        <div class="px-4" v-on="on">
          <Icon class="mx-2">
            cloud_off
          </Icon>
          <span class="font-weight-bold">
            {{ $tr('offlineIndicatorText') }}
          </span>
        </div>
      </template>
      <span>{{ $tr('offlineText') }}</span>
    </VTooltip>

    <BottomToolBar v-else-if="bottom" color="white" flat>
      <Icon class="mx-3">
        cloud_off
      </Icon>
      <span>{{ $tr('offlineText') }}</span>
    </BottomToolBar>
    <ToolBar v-else-if="toolbar" flat>
      <Icon class="mx-3">
        cloud_off
      </Icon>
      <span>{{ $tr('offlineText') }}</span>
    </ToolBar>
    <div v-else>
      <Icon class="mx-3">
        cloud_off
      </Icon>
      <span>{{ $tr('offlineText') }}</span>
    </div>
  </div>

</template>

<script>

  import { mapState } from 'vuex';
  import BottomToolBar from './BottomToolBar';
  import ToolBar from './ToolBar';

  export default {
    name: 'OfflineText',
    components: {
      ToolBar,
      BottomToolBar,
    },
    props: {
      indicator: {
        type: Boolean,
        default: false,
      },
      bottom: {
        type: Boolean,
        default: false,
      },
      toolbar: {
        type: Boolean,
        default: false,
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
      offlineText: 'Offline. Your changes will be saved once your connection is back.',
    },
  };

</script>
<style scoped>
  span {
    vertical-align: bottom;
  }
</style>
