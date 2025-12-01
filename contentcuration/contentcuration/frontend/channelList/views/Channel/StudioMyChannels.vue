<template>

  <div class="studio-channels">
    <div
      class="new-channel"
      :style="{ maxWidth: maxWidthStyle }"
    >
      <KButton
        v-if="!loading"
        primary
        data-test="add-channel"
        :text="$tr('channel')"
        @click="newChannel"
      />
    </div>
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
          v-for="channel in listChannels"
          :key="channel.id"
          :channel="channel"
        />
      </KCardGrid>
    </div>
  </div>

</template>


<script>

  import { useChannelList } from '../../composables/useChannelList';
  import { RouteNames } from '../../constants';
  import StudioChannelCard from './components/StudioChannelCard';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioMyChannels',
    components: {
      StudioChannelCard,
    },
    setup() {
      // Use the channel list composable
      const { loading, listChannels, maxWidthStyle } = useChannelList({
        listType: ChannelListTypes.EDITABLE,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      return {
        loading,
        listChannels,
        maxWidthStyle,
      };
    },
    methods: {
      newChannel() {
        this.$analytics.trackClick('channel_list', 'Create channel');
        this.$router.push({
          name: RouteNames.NEW_CHANNEL,
          query: { last: this.$route.name },
        });
      },
    },
    $trs: {
      channel: 'New channel',
      noChannelsFound: 'No channels found',
    },
  };

</script>


<style lang="scss" scoped>

  @import './styles/StudioChannels';

  .new-channel {
    display: flex;
    justify-content: end;
    width: 100%;
    margin-top: 20px;
  }

</style>
