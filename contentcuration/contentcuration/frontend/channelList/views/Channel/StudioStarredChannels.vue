<template>

  <div class="studio-channels">
    <div
      class="channels-body"
      :style="{ maxWidth: maxWidthStyle }"
    >
      <p
        v-if="!listChannels.length && !loading"
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
        <StudioChannelCard
          v-for="(channel, index) in listChannels"
          :key="channel.id"
          :channel="channel"
          :index="index"
        />
      </KCardGrid>
    </div>
  </div>

</template>


<script>

  import { useChannelList } from '../../composables/useChannelList';
  import StudioChannelCard from './components/StudioChannelCard';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioStarredChannels',
    components: {
      StudioChannelCard,
    },
    setup() {
      // Use the channel list composable with STARRED type
      const { loading, listChannels, maxWidthStyle } = useChannelList({
        listType: ChannelListTypes.STARRED,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      return {
        loading,
        listChannels,
        maxWidthStyle,
      };
    },
    $trs: {
      noChannelsFound: 'No channels found',
    },
  };

</script>


<style lang="scss" scoped>

  @import './styles/StudioChannels';

</style>
