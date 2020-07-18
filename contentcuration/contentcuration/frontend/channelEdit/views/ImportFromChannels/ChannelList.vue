<template>

  <VContainer class="px-0" fluid>
    <!-- Filters -->
    <VLayout row wrap>
      <VFlex sm3 class="px-3">
        <VSelect
          v-model="channelFilter"
          :label="$tr('channelFilterLabel')"
          :items="channelFilterOptions"
        />
      </VFlex>
      <VFlex sm3 class="px-3">
        <LanguageDropdown v-model="languageFilter" />
      </VFlex>
    </VLayout>

    <!-- Main Area with Cards -->
    <VProgressLinear v-if="loading" indeterminate />
    <p v-else-if="channels.length === 0">
      {{ $tr('noMatchingChannels') }}
    </p>
    <div v-else>
      <ChannelInfoCard
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
        class="mb-3"
      />
      <VLayout justify-center class="mt-4">
        <Pagination :totalPages="pageCount" />
      </VLayout>
    </div>
  </VContainer>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import ChannelInfoCard from './ChannelInfoCard';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import Pagination from 'shared/views/Pagination';

  const channelFilterMap = {
    ALL: 'ALL',
    MY_CHANNELS: 'MY_CHANNELS',
    VIEW_ONLY: 'VIEW_ONLY',
    STARRED: 'STARRED',
    PUBLIC: 'PUBLIC',
  };

  const channelFilters = {
    [channelFilterMap.ALL]: {},
    [channelFilterMap.MY_CHANNELS]: { edit: true },
    [channelFilterMap.VIEW_ONLY]: { view: true },
    [channelFilterMap.STARRED]: { bookmark: true },
    [channelFilterMap.PUBLIC]: { public: true },
  };

  export default {
    name: 'ChannelList',
    components: {
      ChannelInfoCard,
      LanguageDropdown,
      Pagination,
    },
    data() {
      return {
        channelFilter: channelFilterMap.ALL,
        languageFilter: '',
        channels: [],
        pageCount: 0,
        loading: false,
      };
    },
    computed: {
      ...mapState('currentChannel', ['currentChannelId']),
      channelFilterOptions() {
        return [
          {
            text: this.$tr('channelFilterOptionAll'),
            value: channelFilterMap.ALL,
          },
          {
            text: this.$tr('channelFilterOptionMine'),
            value: channelFilterMap.MY_CHANNELS,
          },
          {
            text: this.$tr('channelFilterOptionViewOnly'),
            value: channelFilterMap.VIEW_ONLY,
          },
          {
            text: this.$tr('channelFilterOptionStarred'),
            value: channelFilterMap.STARRED,
          },
          {
            text: this.$tr('channelFilterOptionPublic'),
            value: channelFilterMap.PUBLIC,
          },
        ];
      },
    },
    watch: {
      '$route.query.page'() {
        this.loadPage();
      },
    },
    mounted() {
      this.loadPage();
    },
    methods: {
      ...mapActions('importFromChannels', ['loadChannels']),
      loadPage() {
        this.loading = true;
        this.loadChannels({
          language: this.languageFilter,
          ...channelFilters[this.channelFilter],
          page: this.$route.query.page || 1,
          exclude: this.currentChannelId,
        }).then(page => {
          this.pageCount = page.total_pages;
          this.channels = page.results;
          this.loading = false;
        });
      },
    },
    $trs: {
      channelFilterLabel: 'Channels',
      channelFilterOptionAll: 'All channels',
      channelFilterOptionMine: 'My channels',
      channelFilterOptionViewOnly: 'View-only',
      channelFilterOptionStarred: 'Starred',
      channelFilterOptionPublic: 'Public',
      noMatchingChannels: 'There are no matching channels',
    },
  };

</script>
