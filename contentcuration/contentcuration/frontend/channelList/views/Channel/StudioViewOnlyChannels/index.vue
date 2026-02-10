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
    name: 'StudioViewOnlyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
    },
    setup() {
      const { loading, channels } = useChannelList({
        listType: ChannelListTypes.VIEW_ONLY,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      return {
        loading,
        channels,
      };
    },
    $trs: {
      title: 'View-only channels',
    },
  };

</script>
