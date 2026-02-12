<template>

  <StudioChannelsPage :loading="loading">
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>
    </template>

    <template #cards>
      <StudioChannelCard
        v-for="channel in bookmarkedChannels"
        :key="channel.id"
        :headingLevel="2"
        :channel="channel"
        :footerButtons="['info', 'bookmark']"
        :dropdownOptions="getDropdownOptions(channel)"
        @click="onCardClick(channel)"
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
        bookmarkedChannels: channels,
      };
    },
    methods: {
      onCardClick(channel) {
        window.location.href = window.Urls.channel(channel.id);
      },
      getDropdownOptions(channel) {
        const options = [];
        if (channel.edit) {
          options.push('edit');
          options.push('delete');
        } else {
          options.push('remove');
        }
        if (channel.published) {
          options.push('copy');
        }
        if (channel.source_url) {
          options.push('source-url');
        }
        if (channel.demo_server_url) {
          options.push('demo-url');
        }
        return options;
      },
    },
    $trs: {
      title: 'Starred channels',
    },
  };

</script>
