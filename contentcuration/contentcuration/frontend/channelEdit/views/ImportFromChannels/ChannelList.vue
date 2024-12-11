<template>

  <VContainer class="mx-0 px-0">
    <!-- Filters -->
    <VLayout row wrap>
      <DropdownWrapper
        component="VFlex"
        sm6
        md6
        lg6
        xl6
        class="pr-3"
      >
        <template #default="{ attach, menuProps }">
          <VSelect
            v-model="channelFilter"
            :label="$tr('channelFilterLabel')"
            :items="channelFilterOptions"
            :attach="attach"
            :menu-props="menuProps"
            :disabled="loading"
            box
          />
        </template>
      </DropdownWrapper>
      <VFlex sm6 md6 lg6 xl6>
        <LanguageDropdown v-model="languageFilter" />
      </VFlex>
    </VLayout>

    <!-- Main Area with Cards -->
    <LoadingText v-if="loading" />
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
  import LoadingText from 'shared/views/LoadingText';
  import { constantsTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'ChannelList',
    components: {
      DropdownWrapper,
      ChannelInfoCard,
      LanguageDropdown,
      Pagination,
      LoadingText,
    },
    mixins: [constantsTranslationMixin],
    data() {
      return {
        languageFilter: null,
        channels: [],
        pageCount: 0,
        loading: false,
      };
    },
    computed: {
      ...mapState('currentChannel', ['currentChannelId']),
      channelFilter: {
        get() {
          return this.$route.query.channel_list || ChannelListTypes.PUBLIC;
        },
        set(channel_list) {
          this.$router.push({
            ...this.$route,
            query: {
              ...this.$route.query,
              channel_list,
            },
          });
          this.loadPage();
        },
      },
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
      languageFilter() {
        this.loadPage();
        this.$emit('update-language', this.languageFilter);
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
          languages: this.languageFilter,
          [this.channelFilter]: true,
          page: this.$route.query.page || 1,
          exclude: this.currentChannelId,
          ordering: this.channelFilter === 'public' ? 'name' : '-modified',
          published: true,
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
