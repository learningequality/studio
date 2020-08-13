<template>

  <VContainer class="px-0 mx-0">
    <!-- Filters -->
    <VLayout row wrap>
      <VFlex sm3 class="px-3">
        <VSelect
          v-model="channelFilter"
          :label="$tr('channelFilterLabel')"
          :items="channelFilterOptions"
          :menu-props="{offsetY: true}"
          box
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
  import { ChannelListTypes } from 'shared/constants';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import Pagination from 'shared/views/Pagination';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ChannelList',
    components: {
      ChannelInfoCard,
      LanguageDropdown,
      Pagination,
    },
    mixins: [constantsTranslationMixin],
    data() {
      return {
        channelFilter: ChannelListTypes.PUBLIC,
        languageFilter: '',
        channels: [],
        pageCount: 0,
        loading: false,
      };
    },
    computed: {
      ...mapState('currentChannel', ['currentChannelId']),
      channelFilterOptions() {
        return Object.values(ChannelListTypes).map(value => {
          return {
            value,
            text: this.translateConstant(value),
          };
        });
      },
    },
    watch: {
      '$route.query.page'() {
        this.loadPage();
      },
      channelFilter() {
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
          [this.channelFilter]: true,
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
      noMatchingChannels: 'There are no matching channels',
    },
  };

</script>
