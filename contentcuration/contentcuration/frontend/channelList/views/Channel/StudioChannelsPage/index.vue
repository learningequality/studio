<template>

  <div
    class="channels-container"
    :style="{ maxWidth: maxWidthStyle }"
  >
    <slot name="header"></slot>

    <p
      v-if="!$slots.cards && !loading"
      class="no-channels"
    >
      {{ $tr('noChannelsFound') }}
    </p>

    <KCardGrid
      layout="1-1-1"
      :loading="loading"
      :skeletonsConfig="[
        {
          breakpoints: [0, 1, 2, 3, 4, 5, 6, 7],
          orientation: 'vertical',
          count: 3,
        },
      ]"
      class="cards"
    >
      <slot name="cards"></slot>
    </KCardGrid>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'StudioChannelsPage',
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();

      const maxWidthStyle = computed(() => {
        if (windowBreakpoint.value >= 5) return '50%';
        if (windowBreakpoint.value === 4) return '66.66%';
        if (windowBreakpoint.value === 3) return '83.33%';
        return '100%';
      });

      return {
        maxWidthStyle,
      };
    },
    props: {
      loading: {
        type: Boolean,
        required: true,
      },
    },
    $trs: {
      noChannelsFound: 'No channels found',
    },
  };

</script>


<style lang="scss" scoped>

  .channels-container {
    margin: auto;
  }

  .no-channels {
    font-size: 24px;
  }

  .cards {
    margin-top: 16px;
  }

</style>
