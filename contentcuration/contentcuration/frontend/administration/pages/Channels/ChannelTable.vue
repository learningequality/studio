<template>

  <div>
    <h1 class="font-weight-bold px-4 py-2 title">
      {{ `${$formatNumber(count)} ${count === 1 ? 'channel' : 'channels'}` }}
    </h1>
    <VLayout
      rowwrap
      class="mb-2"
    >
      <VFlex
        xs12
        sm4
        xl3
        class="px-3"
      >
        <VSelect
          v-model="channelTypeFilter"
          :items="channelTypeOptions"
          item-text="label"
          item-value="key"
          label="Channel Type"
          box
          clearable
          :menu-props="{ offsetY: true }"
        />
      </VFlex>
      <VFlex
        xs12
        sm4
        xl3
        clearable
        class="px-3"
      >
        <VSelect
          v-model="channelStatusFilter"
          :items="channelStatusOptions"
          item-text="label"
          item-value="key"
          label="Channel Status"
          box
          :disabled="!channelTypeFilter"
          :menu-props="{ offsetY: true }"
        />
      </VFlex>
      <VFlex
        xs12
        sm4
        xl3
        class="px-3"
      >
        <LanguageDropdown
          ref="languageDropdown"
          v-model="languageFilter"
        />
      </VFlex>
      <VFlex
        xs12
        sm4
        xl3
        class="px-3"
      >
        <VTextField
          v-model="keywordInput"
          label="Search for a channel..."
          prepend-inner-icon="search"
          clearable
          box
          hint="Search for channels by their names, tokens, ids, or editors"
          persistent-hint
          @input="setKeywords"
          @click:clear="clearSearch"
        />
      </VFlex>
    </VLayout>
    <VDataTable
      v-model="selected"
      :headers="headers"
      :items="channels"
      :loading="loading"
      :pagination.sync="pagination"
      :rows-per-page-items="rowsPerPageItems"
      :total-items="count"
      class="table-col-freeze"
      :class="{ expanded: $vuetify.breakpoint.mdAndUp }"
      :no-data-text="loading ? 'Loading...' : 'No channels found'"
    >
      <template #progress>
        <VProgressLinear
          v-if="loading"
          color="loading"
          indeterminate
          data-test="loading"
        />
      </template>
      <template #headerCell="{ header }">
        <div
          style="display: inline-block; width: min-content"
          @click.stop
        >
          <Checkbox
            v-if="header.class === 'first'"
            v-model="selectAll"
            class="ma-0"
            :indeterminate="Boolean(selected.length) && selected.length !== channels.length"
          />
        </div>

        <template v-if="header.class === 'first' && selected.length">
          <span>({{ selectedCount }})</span>
          <IconButton
            icon="download"
            class="ma-0"
            text="Download CSV"
            data-test="csv"
            @click="downloadCSV"
          />
          <IconButton
            icon="pdf"
            class="ma-0"
            text="Download PDF"
            data-test="pdf"
            @click="downloadPDF"
          />
        </template>
        <span v-else>
          {{ header.text }}
        </span>
      </template>
      <template #items="{ item }">
        <ChannelItem
          v-model="selected"
          :channelId="item"
        />
      </template>
    </VDataTable>
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { getCurrentInstance, onMounted, ref, computed, watch } from 'vue';
  import transform from 'lodash/transform';
  import { RouteNames, rowsPerPageItems } from '../../constants';
  import { useTable } from '../../composables/useTable';
  import ChannelItem from './ChannelItem';
  import { useKeywordSearch } from 'shared/composables/useKeywordSearch';
  import { useFilter } from 'shared/composables/useFilter';
  import { channelExportMixin } from 'shared/views/channel/mixins';
  import { routerMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import LanguageDropdown from 'shared/views/LanguageDropdown';

  const channelTypeFilterMap = {
    kolibriStudio: { label: 'Kolibri Studio Library', params: { public: true, deleted: false } },
    community: { label: 'Community Library', params: { has_community_library_submission: true } },
    unlisted: {
      label: 'Unlisted Channels',
      params: { has_community_library_submission: false, public: false },
    },
  };

  export default {
    name: 'ChannelTable',
    components: {
      Checkbox,
      ChannelItem,
      LanguageDropdown,
      IconButton,
    },
    mixins: [channelExportMixin, routerMixin],
    setup() {
      const { proxy } = getCurrentInstance();
      const store = proxy.$store;

      const statusFilterMap = computed(() => {
        if (channelTypeFilter.value === 'kolibriStudio') {
          return {
            live: { label: 'Live', params: {} },
            cheffed: { label: 'Sushi chef', params: { cheffed: true } },
          };
        } else if (channelTypeFilter.value === 'community') {
          return {
            live: { label: 'Live', params: { community_library_live: true } },
            needsReview: {
              label: 'Needs review',
              params: {
                community_library_live: false,
                latest_community_library_submission_status: ['PENDING', 'REJECTED'],
              },
            },
            published: { label: 'Published', params: {} },
            cheffed: { label: 'Sushi chef', params: { cheffed: true } },
          };
        } else if (channelTypeFilter.value === 'unlisted') {
          return {
            live: { label: 'Live', params: {} },
            draft: { label: 'Draft', params: { published: false } },
            published: { label: 'Published', params: { published: true } },
            cheffed: { label: 'Sushi chef', params: { cheffed: true } },
          };
        }
        return {};
      });

      const languageDropdown = ref(null);
      const languageFilterMap = ref({});

      onMounted(() => {
        // The languageFilterMap is built from the options in the LanguageDropdown component,
        // so we need to wait until it's mounted to access them.
        const languages = languageDropdown.value.languages;

        languageFilterMap.value = transform(languages, (result, language) => {
          result[language.id] = {
            label: language.readable_name,
            params: { languages: language.id },
          };
        });
      });

      const {
        filter: _channelTypeFilter,
        options: channelTypeOptions,
        fetchQueryParams: channelTypeFetchQueryParams,
      } = useFilter({
        name: 'channelType',
        filterMap: channelTypeFilterMap,
      });
      // Temporal wrapper, must be removed after migrating to KSelect
      const channelTypeFilter = computed({
        get: () => _channelTypeFilter.value.value || undefined,
        set: value => {
          _channelTypeFilter.value =
            channelTypeOptions.value.find(option => option.value === value) || {};
        },
      });

      const {
        filter: _channelStatusFilter,
        options: channelStatusOptions,
        fetchQueryParams: channelStatusFetchQueryParams,
      } = useFilter({
        name: 'channelStatus',
        filterMap: statusFilterMap,
      });
      // Temporal wrapper, must be removed after migrating to KSelect
      const channelStatusFilter = computed({
        get: () => _channelStatusFilter.value.value || undefined,
        set: value => {
          _channelStatusFilter.value =
            channelStatusOptions.value.find(option => option.value === value) || {};
        },
      });

      const {
        filter: _languageFilter,
        options: languageOptions,
        fetchQueryParams: languageFetchQueryParams,
      } = useFilter({
        name: 'language',
        filterMap: languageFilterMap,
      });
      // Temporal wrapper, must be removed after migrating to KSelect
      const languageFilter = computed({
        get: () => _languageFilter.value.value || undefined,
        set: value => {
          _languageFilter.value =
            languageOptions.value.find(option => option.value === value) || {};
        },
      });

      const {
        keywordInput,
        setKeywords,
        clearSearch,
        fetchQueryParams: keywordSearchFetchQueryParams,
      } = useKeywordSearch();

      watch(channelTypeFilter, () => {
        const options = channelStatusOptions.value;
        channelStatusFilter.value = options.length ? options[0].key : null;
      });

      const filterFetchQueryParams = computed(() => {
        return {
          ...channelTypeFetchQueryParams.value,
          ...channelStatusFetchQueryParams.value,
          ...languageFetchQueryParams.value,
          ...keywordSearchFetchQueryParams.value,
        };
      });

      function loadChannels(fetchParams) {
        return store.dispatch('channelAdmin/loadChannels', fetchParams);
      }

      const { pagination, loading } = useTable({
        fetchFunc: fetchParams => loadChannels(fetchParams),
        filterFetchQueryParams,
      });

      return {
        channelTypeFilter,
        channelTypeOptions,
        channelStatusFilter,
        channelStatusOptions,
        languageFilter,
        languageDropdown,
        keywordInput,
        setKeywords,
        clearSearch,
        pagination,
        loading,
      };
    },
    data() {
      return {
        selected: [],
      };
    },
    computed: {
      ...mapGetters('channelAdmin', ['count', 'channels']),
      selectAll: {
        get() {
          return (
            Boolean(this.selected.length) &&
            this.selected.length === this.channels.length &&
            !this.loading
          );
        },
        set(value) {
          if (value) {
            this.selected = this.channels;
          } else {
            this.selected = [];
          }
        },
      },
      headers() {
        const firstColumn = this.$vuetify.breakpoint.smAndDown
          ? [{ class: 'first', sortable: false }]
          : [];
        return firstColumn.concat([
          {
            text: 'Channel name',
            align: 'left',
            class: `${this.$vuetify.breakpoint.smAndDown ? '' : 'first'}`,
            value: 'name',
          },
          { text: 'Token ID', value: 'primary_token', sortable: false },
          { text: 'Channel ID', value: 'id', sortable: false },
          { text: 'Size', value: 'size', sortable: false },
          { text: 'Editors', value: 'editors_count', sortable: false },
          { text: 'Viewers', value: 'viewers_count', sortable: false },
          { text: 'Date created', value: 'created', sortable: false },
          { text: 'Last updated', value: 'modified' },
          { text: 'Demo URL', value: 'demo_server_url', sortable: false },
          { text: 'Source URL', value: 'source_url', sortable: false },
          {
            text: 'Latest community library submission',
            value: 'latest_community_library_submission_status',
            sortable: false,
          },
          { text: 'Actions', sortable: false, align: 'center' },
        ]);
      },
      rowsPerPageItems() {
        return rowsPerPageItems;
      },
      selectedCount() {
        return this.selected.length;
      },
    },
    watch: {
      $route: {
        deep: true,
        handler(newRoute, oldRoute) {
          if (newRoute.name === oldRoute.name && newRoute.name === RouteNames.CHANNELS)
            this.selected = [];
        },
      },
      'channels.length'() {
        this.selected = [];
      },
    },
    mounted() {
      this.updateTabTitle('Channels - Administration');
    },
    methods: {
      ...mapActions('channelAdmin', ['getAdminChannelListDetails']),
      async downloadPDF() {
        this.$store.dispatch('showSnackbarSimple', 'Generating PDF...');
        const channelList = await this.getAdminChannelListDetails(this.selected);
        return this.generateChannelsPDF(channelList);
      },
      async downloadCSV() {
        this.$store.dispatch('showSnackbarSimple', 'Generating CSV...');
        const channelList = await this.getAdminChannelListDetails(this.selected);
        return this.generateChannelsCSV(channelList);
      },
    },
  };

</script>
