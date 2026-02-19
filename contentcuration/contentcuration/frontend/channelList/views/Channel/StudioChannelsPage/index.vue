<template>

  <div
    class="channels-container"
    :style="{ maxWidth: maxWidthStyle }"
  >
    <StudioRaisedBox
      v-if="invitations.length"
      class="invitations"
    >
      <template #header>
        {{ $tr('invitations', { count: invitations.length }) }}
      </template>
      <template #main>
        <ul>
          <ChannelInvitation
            v-for="invitation in invitations"
            :key="invitation.id"
            :invitationID="invitation.id"
          />
        </ul>
      </template>
    </StudioRaisedBox>

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
      :skeletonsConfig="skeletonsConfig"
      :syncCardsMetrics="false"
      class="cards"
    >
      <slot name="cards"></slot>
    </KCardGrid>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import ChannelInvitation from '../ChannelInvitation';
  import StudioRaisedBox from 'shared/views/StudioRaisedBox';

  export default {
    name: 'StudioChannelsPage',
    components: {
      ChannelInvitation,
      StudioRaisedBox,
    },
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();

      const maxWidthStyle = computed(() => {
        if (windowBreakpoint.value >= 5) return '50%';
        if (windowBreakpoint.value === 4) return '66.66%';
        if (windowBreakpoint.value === 3) return '83.33%';
        return '100%';
      });

      const skeletonsConfig = computed(() => {
        return [
          {
            breakpoints: [0, 1, 2, 3, 4, 5, 6, 7],
            count: 2,
            orientation: 'vertical',
            thumbnailDisplay: 'small',
            thumbnailAlign: 'left',
            thumbnailAspectRatio: '16:9',
            minHeight: '380px',
          },
          {
            breakpoints: [2, 3, 4, 5, 6, 7],
            orientation: 'horizontal',
            minHeight: '230px',
          },
        ];
      });

      return {
        maxWidthStyle,
        skeletonsConfig,
      };
    },
    props: {
      loading: {
        type: Boolean,
        required: true,
      },
      invitations: {
        type: Array,
        default: () => [],
      },
    },
    $trs: {
      noChannelsFound: 'No channels found',
      invitations: 'You have {count, plural,\n =1 {# invitation}\n other {# invitations}}',
    },
  };

</script>


<style lang="scss" scoped>

  .channels-container {
    padding-bottom: 24px;
    margin-right: auto;
    margin-left: auto;
  }

  .invitations {
    margin-bottom: 24px;
  }

  .no-channels {
    font-size: 24px;
  }

  .cards {
    margin-top: 16px;
  }

</style>
