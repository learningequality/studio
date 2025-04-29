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
          v-model="filter"
          :items="filters"
          item-text="label"
          item-value="key"
          label="Channel Type"
          box
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
          v-model="language"
          item-id="id"
          item-text="readable_name"
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
  import { RouteNames, rowsPerPageItems } from '../../constants';
  import { tableMixin, generateFilterMixin } from '../../mixins';
  import ChannelItem from './ChannelItem';
  import { channelExportMixin } from 'shared/views/channel/mixins';
  import { routerMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import LanguageDropdown from 'shared/views/LanguageDropdown';

  const channelFilters = {
    live: { label: 'Live', params: { deleted: false } },
    mychannels: { label: 'My channels', params: { edit: true, deleted: false } },
    published: { label: 'Published', params: { published: true, deleted: false } },
    public: { label: 'Public', params: { public: true, deleted: false } },
    staged: { label: 'Needs review', params: { staged: true, deleted: false } },
    cheffed: { label: 'Sushi chef', params: { cheffed: true, deleted: false } },
    deleted: { label: 'Deleted', params: { deleted: true } },
  };

  const filterMixin = generateFilterMixin(channelFilters);

  export default {
    name: 'ChannelTable',
    components: {
      Checkbox,
      ChannelItem,
      LanguageDropdown,
      IconButton,
    },
    mixins: [tableMixin, filterMixin, channelExportMixin, routerMixin],
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
      language: {
        get() {
          return this.$route.query.languages;
        },
        set(languages) {
          this.updateQueryParams({
            ...this.$route.query,
            languages,
            page: 1,
          });
        },
      },
      headers() {
        const firstColumn = this.$vuetify.breakpoint.smAndDown ? [{ class: 'first' }] : [];
        return firstColumn.concat([
          {
            text: 'Channel name',
            align: 'left',
            class: `${this.$vuetify.breakpoint.smAndDown ? '' : 'first'}`,
            value: 'name',
          },
          { text: 'Token ID', value: 'primary_token' },
          { text: 'Channel ID', value: 'id' },
          { text: 'Size', value: 'size', sortable: false },
          { text: 'Editors', value: 'editors_count', sortable: false },
          { text: 'Viewers', value: 'viewers_count', sortable: false },
          { text: 'Date created', value: 'created' },
          { text: 'Last updated', value: 'modified' },
          { text: 'Demo URL', value: 'demo_server_url' },
          { text: 'Source URL', value: 'source_url' },
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
      ...mapActions('channelAdmin', ['loadChannels', 'getAdminChannelListDetails']),
      /**
       * @public
       * @param params
       * @return {*}
       */
      fetch(params) {
        return this.loadChannels(params);
      },
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
