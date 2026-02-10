<template>

  <StudioChannelsPage :loading="loading">
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>
    </template>
    <template #cards>
      <StudioChannelCard
        v-for="channel in channels"
        :key="channel.id"
        :headingLevel="2"
        :channel="channel"
        @click="onCardClick(channel.id)"
      />
    </template>
  </StudioChannelsPage>

</template>


<script>

  import { useChannelList } from '../../../composables/useChannelList';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioStarredChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
    },
    setup() {
      const { loading, channels } = useChannelList({
        listType: ChannelListTypes.STARRED,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      return {
        loading,
        channels,
      };
    },
    methods: {
      onCardClick(channelId) {
        window.location.href = window.Urls.channel(channelId);
      },
    },
    $trs: {
      title: 'Starred channels',
    },
  };

</script>
