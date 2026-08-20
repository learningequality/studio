<template>

  <div>
    <h1 class="font-weight-bold px-4 py-2 title">
      {{ userCount$({ count }) }}
      <IconButton
        v-if="count"
        icon="email"
        class="ma-0"
        :color="$themeTokens.primary"
        :text="emailUsersAction$({ count })"
        @click="showMassEmailDialog = true"
      />
      <IconButton
        icon="download"
        class="ma-0"
        :color="$themeTokens.primary"
        :text="downloadCSVAction$()"
        data-test="csv"
        :disabled="!count"
        @click="onDownloadCSV"
      />
    </h1>
    <EmailUsersDialog
      v-model="showMassEmailDialog"
      :userTypeFilter="userTypeFilter"
      :locationFilter="locationFilter"
      :keywordFilter="keywordInput"
      :usersFilterFetchQueryParams="filterFetchQueryParams"
    />
    <KGrid class="filter-row">
      <KGridItem
        :layout12="{ span: 3 }"
        :layout8="{ span: 2 }"
        :layout4="{ span: 4 }"
      >
        <KSelect
          class="user-type-select"
          :value="userTypeFilter"
          :options="userTypeOptions"
          :label="userTypeLabel$()"
          @select="userTypeFilter = $event"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 3 }"
        :layout8="{ span: 2 }"
        :layout4="{ span: 4 }"
      >
        <CountryField
          ref="locationDropdown"
          v-model="locationFilter"
          :outline="false"
          :multiple="false"
          :label="targetLocationLabel$()"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 3 }"
        :layout8="{ span: 2 }"
        :layout4="{ span: 4 }"
      >
        <KTextbox
          v-model="keywordInput"
          :label="searchLabel$()"
          clearable
          :clearAriaLabel="clearAction$()"
          @input="setKeywords"
        >
          <template #innerBefore>
            <KIcon
              class="search-icon"
              icon="search"
              :color="$themeTokens.annotation"
            />
          </template>
        </KTextbox>
      </KGridItem>
    </KGrid>
    <KGrid class="filter-row">
      <KGridItem
        :layout12="{ span: 3 }"
        :layout8="{ span: 2 }"
        :layout4="{ span: 4 }"
      >
        <KSelect
          :value="joinedWithinFilter"
          :options="joinedWithinOptions"
          :label="joinedWithinLabel$()"
          @select="joinedWithinFilter = $event"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 3 }"
        :layout8="{ span: 2 }"
        :layout4="{ span: 4 }"
      >
        <KSelect
          :value="activeWithinFilter"
          :options="activeWithinOptions"
          :label="activeWithinLabel$()"
          @select="activeWithinFilter = $event"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <div class="toggle-filters">
          <Checkbox
            v-model="hasPublishedFilter"
            class="toggle-checkbox"
            :label="hasPublishedLabel$()"
          />
          <Checkbox
            v-model="hasEditsFilter"
            class="toggle-checkbox"
            :label="hasStudioActivityLabel$()"
          />
          <KButton
            v-if="hasActiveFilters"
            appearance="basic-link"
            :text="clearFiltersAction$()"
            data-test="clear-filters"
            @click="clearFilters"
          />
        </div>
      </KGridItem>
    </KGrid>
    <VDataTable
      v-model="selected"
      :headers="headers"
      :loading="loading"
      class="table-col-freeze"
      :pagination.sync="pagination"
      :total-items="count"
      :rows-per-page-items="rowsPerPageItems"
      :items="users"
      :no-data-text="loading ? loadingMessage$() : noUsersFoundMessage$()"
      :class="{ expanded: $vuetify.breakpoint.mdAndUp }"
    >
      <template #progress>
        <KLinearLoader
          v-if="loading"
          delay
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
            :indeterminate="Boolean(selected.length) && selected.length !== users.length"
          />
        </div>

        <template v-if="header.class === 'first' && selected.length">
          <span>({{ selectedCount }})</span>
          <IconButton
            icon="email"
            class="ma-0"
            :text="emailAction$()"
            data-test="email"
            @click="showEmailDialog = true"
          />
        </template>
        <span v-else>
          {{ header.text }}
        </span>
      </template>
      <template #items="{ item }">
        <UserItem
          v-model="selected"
          :userId="item"
          @deleted="loadItems"
        />
      </template>
    </VDataTable>
    <EmailUsersDialog
      v-model="showEmailDialog"
      :initialRecipients="selected"
    />
  </div>

</template>


<script>

  import { ref, onMounted, computed, getCurrentInstance } from 'vue';
  import { mapGetters } from 'vuex';
  import pick from 'lodash/pick';
  import transform from 'lodash/transform';
  import { saveAs } from 'file-saver';
  import { useRoute } from 'vue-router/composables';
  import { useTable } from '../../composables/useTable';
  import { RouteNames, rowsPerPageItems } from '../../constants';
  import EmailUsersDialog from './EmailUsersDialog';
  import UserItem from './UserItem';
  import { usersStrings } from './usersStrings';
  import { commonStrings } from 'shared/strings/commonStrings';
  import client from 'shared/client';
  import { useFilter } from 'shared/composables/useFilter';
  import { useKeywordSearch } from 'shared/composables/useKeywordSearch';
  import { useQueryParams } from 'shared/composables/useQueryParams';
  import { routerMixin } from 'shared/mixins';
  import IconButton from 'shared/views/IconButton';
  import Checkbox from 'shared/views/form/Checkbox';
  import CountryField from 'shared/views/form/CountryField';

  const {
    userCount$,
    emailUsersAction$,
    emailAction$,
    downloadCSVAction$,
    clearFiltersAction$,
    userTypeLabel$,
    targetLocationLabel$,
    searchLabel$,
    joinedWithinLabel$,
    activeWithinLabel$,
    hasPublishedLabel$,
    hasStudioActivityLabel$,
    userTypeAll$,
    userTypeActive$,
    userTypeInactive$,
    userTypeAdministrators$,
    userTypeSushiChef$,
    booleanFilterAny$,
    dateWindowAnyTime$,
    dateWindowLastMonth$,
    dateWindowLast3Months$,
    dateWindowLast6Months$,
    dateWindowLastYear$,
    nameHeader$,
    emailHeader$,
    diskSpaceHeader$,
    canEditHeader$,
    canViewHeader$,
    dateJoinedHeader$,
    lastActiveHeader$,
    actionsHeader$,
    loadingMessage$,
    noUsersFoundMessage$,
    generatingCSVMessage$,
    noFiltersAppliedMessage$,
    csvDownloadFailedMessage$,
    tabTitle$,
  } = usersStrings;

  const { clearAction$ } = commonStrings;

  const userTypeFilterMap = {
    all: { label: userTypeAll$(), params: {} },
    active: { label: userTypeActive$(), params: { is_active: true } },
    inactive: { label: userTypeInactive$(), params: { is_active: false } },
    administrator: { label: userTypeAdministrators$(), params: { is_admin: true } },
    sushichef: { label: userTypeSushiChef$(), params: { chef: true } },
  };

  const TABLE_STATE_QUERY_PARAMS = ['page', 'page_size', 'sortBy', 'descending'];

  // Mirrors the defaultValue each filter below declares.
  const FILTER_DEFAULTS = {
    userType: undefined,
    location: undefined,
    keywords: undefined,
    joinedWithin: 'any',
    activeWithin: 'any',
    hasPublished: 'no',
    hasEdits: 'no',
  };

  const DATE_WINDOWS = [
    { key: 'any', label: dateWindowAnyTime$, months: null },
    { key: '1mo', label: dateWindowLastMonth$, months: 1 },
    { key: '3mo', label: dateWindowLast3Months$, months: 3 },
    { key: '6mo', label: dateWindowLast6Months$, months: 6 },
    { key: '1yr', label: dateWindowLastYear$, months: 12 },
  ];

  function buildDateWindowFilterMap(paramName) {
    const map = {};
    for (const window of DATE_WINDOWS) {
      if (window.months === null) {
        map[window.key] = { label: window.label(), params: {} };
      } else {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - window.months);
        const iso = cutoff.toISOString().slice(0, 10);
        map[window.key] = { label: window.label(), params: { [paramName]: iso } };
      }
    }
    return map;
  }

  function useDateWindowFilter({ name, paramName }) {
    const { filter, options, fetchQueryParams } = useFilter({
      name,
      filterMap: buildDateWindowFilterMap(paramName),
      defaultValue: 'any',
    });
    return { filter, options, fetchQueryParams };
  }

  function useBooleanFilter({ name, label, paramName }) {
    const filterMap = {
      no: { label: booleanFilterAny$(), params: {} },
      yes: { label, params: { [paramName]: true } },
    };
    const { filter, options, fetchQueryParams } = useFilter({
      name,
      filterMap,
      defaultValue: 'no',
    });
    const wrapped = computed({
      get: () => filter.value.value === 'yes',
      set: value => {
        const targetKey = value ? 'yes' : 'no';
        filter.value = options.value.find(o => o.value === targetKey) || {};
      },
    });
    return { filter: wrapped, fetchQueryParams };
  }

  export default {
    name: 'UserTable',
    components: {
      Checkbox,
      IconButton,
      EmailUsersDialog,
      UserItem,
      CountryField,
    },
    mixins: [routerMixin],
    setup() {
      const { proxy } = getCurrentInstance();
      const store = proxy.$store;
      const route = useRoute();
      const { updateQueryParams } = useQueryParams();

      const {
        filter: userTypeFilter,
        options: userTypeOptions,
        fetchQueryParams: userTypeFetchQueryParams,
      } = useFilter({
        name: 'userType',
        filterMap: userTypeFilterMap,
      });

      const {
        keywordInput,
        setKeywords,
        fetchQueryParams: keywordSearchFetchQueryParams,
      } = useKeywordSearch();

      const locationFilterMap = ref({});
      const locationDropdown = ref(null);

      const {
        filter: _locationFilter,
        options: locationOptions,
        fetchQueryParams: locationFetchQueryParams,
      } = useFilter({
        name: 'location',
        filterMap: locationFilterMap,
      });
      // CountryField still wraps Vuetify's VAutocomplete, which binds a plain value
      // rather than the option object useFilter holds.
      const locationFilter = computed({
        get: () => _locationFilter.value.value || undefined,
        set: value => {
          _locationFilter.value =
            locationOptions.value.find(option => option.value === value) || {};
        },
      });

      const {
        filter: joinedWithinFilter,
        options: joinedWithinOptions,
        fetchQueryParams: joinedWithinFetchQueryParams,
      } = useDateWindowFilter({ name: 'joinedWithin', paramName: 'joined_since' });

      const {
        filter: activeWithinFilter,
        options: activeWithinOptions,
        fetchQueryParams: activeWithinFetchQueryParams,
      } = useDateWindowFilter({ name: 'activeWithin', paramName: 'active_since' });

      const { filter: hasPublishedFilter, fetchQueryParams: hasPublishedFetchQueryParams } =
        useBooleanFilter({
          name: 'hasPublished',
          label: hasPublishedLabel$(),
          paramName: 'published_channel',
        });

      const { filter: hasEditsFilter, fetchQueryParams: hasEditsFetchQueryParams } =
        useBooleanFilter({
          name: 'hasEdits',
          label: hasStudioActivityLabel$(),
          paramName: 'has_edits',
        });

      onMounted(() => {
        // The locationFilterMap is built from the options in the CountryField component,
        // so we need to wait until it's mounted to access them.
        const locationOptions = locationDropdown.value.options;

        locationFilterMap.value = transform(
          locationOptions,
          (result, option) => {
            result[option.id] = {
              label: option.name,
              params: { location: option.id },
            };
          },
          {},
        );
      });

      const filterFetchQueryParams = computed(() => {
        return {
          ...userTypeFetchQueryParams.value,
          ...locationFetchQueryParams.value,
          ...keywordSearchFetchQueryParams.value,
          ...joinedWithinFetchQueryParams.value,
          ...activeWithinFetchQueryParams.value,
          ...hasPublishedFetchQueryParams.value,
          ...hasEditsFetchQueryParams.value,
        };
      });

      const hasActiveFilters = computed(() =>
        Object.entries(FILTER_DEFAULTS).some(
          ([name, defaultValue]) => (route.query[name] ?? defaultValue) !== defaultValue,
        ),
      );

      function clearFilters() {
        updateQueryParams(pick(route.query, TABLE_STATE_QUERY_PARAMS));
      }

      function loadUsers(fetchParams) {
        return store.dispatch('userAdmin/loadUsers', fetchParams);
      }

      const { pagination, loading, loadItems } = useTable({
        fetchFunc: fetchParams => loadUsers(fetchParams),
        filterFetchQueryParams,
      });

      return {
        userCount$,
        emailUsersAction$,
        emailAction$,
        downloadCSVAction$,
        clearFiltersAction$,
        clearAction$,
        userTypeLabel$,
        targetLocationLabel$,
        searchLabel$,
        joinedWithinLabel$,
        activeWithinLabel$,
        hasPublishedLabel$,
        hasStudioActivityLabel$,
        loadingMessage$,
        noUsersFoundMessage$,
        userTypeFilter,
        userTypeOptions,
        locationDropdown,
        locationFilter,
        keywordInput,
        setKeywords,
        joinedWithinFilter,
        joinedWithinOptions,
        activeWithinFilter,
        activeWithinOptions,
        hasPublishedFilter,
        hasEditsFilter,
        hasActiveFilters,
        clearFilters,
        pagination,
        loading,
        loadItems,
        filterFetchQueryParams,
      };
    },
    data() {
      return {
        selected: [],
        showEmailDialog: false,
        showMassEmailDialog: false,
      };
    },
    computed: {
      ...mapGetters('userAdmin', ['users', 'count']),
      selectAll: {
        get() {
          return (
            Boolean(this.selected.length) &&
            this.selected.length === this.users.length &&
            !this.loading
          );
        },
        set(value) {
          if (value) {
            this.selected = this.users;
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
            text: nameHeader$(),
            align: 'left',
            value: 'last_name',
            class: `${this.$vuetify.breakpoint.smAndDown ? '' : 'first'}`,
          },
          { text: emailHeader$(), value: 'email' },
          { text: diskSpaceHeader$(), value: 'disk_space' },
          { text: canEditHeader$(), value: 'edit_count', sortable: false },
          { text: canViewHeader$(), value: 'view_count', sortable: false },
          { text: dateJoinedHeader$(), value: 'date_joined' },
          { text: lastActiveHeader$(), value: 'last_login' },
          { text: actionsHeader$(), sortable: false, align: 'center' },
        ]);
      },
      selectedCount() {
        return this.selected.length;
      },
      rowsPerPageItems() {
        return rowsPerPageItems;
      },
    },
    watch: {
      $route: {
        deep: true,
        handler(newRoute, oldRoute) {
          if (newRoute.name === oldRoute.name && newRoute.name === RouteNames.USERS)
            this.selected = [];
        },
      },
      'users.length'() {
        this.selected = [];
      },
    },
    mounted() {
      this.updateTabTitle(tabTitle$());
    },
    methods: {
      async onDownloadCSV() {
        this.$store.dispatch('showSnackbarSimple', generatingCSVMessage$());
        try {
          const response = await client.get(window.Urls.admin_users_download_csv(), {
            params: this.filterFetchQueryParams,
            responseType: 'blob',
          });
          const filename = `studio_users_${new Date().toISOString().slice(0, 10)}.csv`;
          saveAs(response.data, filename);
        } catch (error) {
          const status = error.response && error.response.status;
          if (status === 412) {
            this.$store.dispatch('showSnackbarSimple', noFiltersAppliedMessage$());
          } else {
            this.$store.dispatch('showSnackbarSimple', csvDownloadFailedMessage$());
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .filter-row {
    margin-bottom: 8px;
  }

  .filter-row .user-type-select {
    height: 57px;
  }

  .search-icon {
    position: relative;
    left: 4px;
    margin: 4px;
    font-size: 19px;
  }

  .toggle-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
  }

  .filter-row .toggle-filters {
    height: 54px;
  }

  .filter-row .toggle-checkbox {
    margin-bottom: -5px;
  }

</style>
