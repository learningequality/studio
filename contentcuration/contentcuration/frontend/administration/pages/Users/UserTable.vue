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
      :headers="headersFor($vuetify.breakpoint.smAndDown)"
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
          <span>({{ selected.length }})</span>
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


<script setup>

  import { computed, onMounted, ref, watch } from 'vue';
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
  import useStore from 'shared/composables/useStore';
  import { updateTabTitle } from 'shared/i18n';
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

  const tableStateQueryParams = ['page', 'page_size', 'sortBy', 'descending'];

  const filterDefaults = {
    userType: undefined,
    location: undefined,
    keywords: undefined,
    joinedWithin: 'any',
    activeWithin: 'any',
    hasPublished: 'no',
    hasEdits: 'no',
  };

  const userTypeFilterMap = {
    all: { label: userTypeAll$(), params: {} },
    active: { label: userTypeActive$(), params: { is_active: true } },
    inactive: { label: userTypeInactive$(), params: { is_active: false } },
    administrator: { label: userTypeAdministrators$(), params: { is_admin: true } },
    sushichef: { label: userTypeSushiChef$(), params: { chef: true } },
  };

  const dateWindows = [
    { key: 'any', label: dateWindowAnyTime$, monthsAgo: null },
    { key: '1mo', label: dateWindowLastMonth$, monthsAgo: 1 },
    { key: '3mo', label: dateWindowLast3Months$, monthsAgo: 3 },
    { key: '6mo', label: dateWindowLast6Months$, monthsAgo: 6 },
    { key: '1yr', label: dateWindowLastYear$, monthsAgo: 12 },
  ];

  function isoDateMonthsAgo(monthsAgo) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsAgo);
    return cutoff.toISOString().slice(0, 10);
  }

  function buildDateWindowFilterMap(paramName) {
    return transform(
      dateWindows,
      (map, { key, label, monthsAgo }) => {
        const params = monthsAgo === null ? {} : { [paramName]: isoDateMonthsAgo(monthsAgo) };
        map[key] = { label: label(), params };
      },
      {},
    );
  }

  function buildLocationFilterMap(countries) {
    return transform(
      countries,
      (map, { id, name }) => {
        map[id] = { label: name, params: { location: id } };
      },
      {},
    );
  }

  function useDateWindowFilter({ name, paramName }) {
    return useFilter({
      name,
      filterMap: buildDateWindowFilterMap(paramName),
      defaultValue: 'any',
    });
  }

  function useBooleanFilter({ name, label, paramName }) {
    const { filter, options, fetchQueryParams } = useFilter({
      name,
      filterMap: {
        no: { label: booleanFilterAny$(), params: {} },
        yes: { label, params: { [paramName]: true } },
      },
      defaultValue: 'no',
    });
    const isChecked = computed({
      get: () => filter.value.value === 'yes',
      set: checked => {
        filter.value =
          options.value.find(option => option.value === (checked ? 'yes' : 'no')) || {};
      },
    });
    return { filter: isChecked, fetchQueryParams };
  }

  const store = useStore();
  const route = useRoute();
  const { updateQueryParams } = useQueryParams();

  const selected = ref([]);
  const showEmailDialog = ref(false);
  const showMassEmailDialog = ref(false);
  const locationDropdown = ref(null);
  const locationFilterMap = ref({});

  const users = computed(() => store.getters['userAdmin/users']);
  const count = computed(() => store.getters['userAdmin/count']);

  const {
    filter: userTypeFilter,
    options: userTypeOptions,
    fetchQueryParams: userTypeParams,
  } = useFilter({ name: 'userType', filterMap: userTypeFilterMap });

  const {
    filter: locationOption,
    options: locationOptions,
    fetchQueryParams: locationParams,
  } = useFilter({ name: 'location', filterMap: locationFilterMap });

  const locationFilter = computed({
    get: () => locationOption.value.value,
    set: countryId => {
      locationOption.value = locationOptions.value.find(option => option.value === countryId) || {};
    },
  });

  const { keywordInput, setKeywords, fetchQueryParams: keywordParams } = useKeywordSearch();

  const {
    filter: joinedWithinFilter,
    options: joinedWithinOptions,
    fetchQueryParams: joinedWithinParams,
  } = useDateWindowFilter({ name: 'joinedWithin', paramName: 'joined_since' });

  const {
    filter: activeWithinFilter,
    options: activeWithinOptions,
    fetchQueryParams: activeWithinParams,
  } = useDateWindowFilter({ name: 'activeWithin', paramName: 'active_since' });

  const { filter: hasPublishedFilter, fetchQueryParams: hasPublishedParams } = useBooleanFilter({
    name: 'hasPublished',
    label: hasPublishedLabel$(),
    paramName: 'published_channel',
  });

  const { filter: hasEditsFilter, fetchQueryParams: hasEditsParams } = useBooleanFilter({
    name: 'hasEdits',
    label: hasStudioActivityLabel$(),
    paramName: 'has_edits',
  });

  const filterFetchQueryParams = computed(() => ({
    ...userTypeParams.value,
    ...locationParams.value,
    ...keywordParams.value,
    ...joinedWithinParams.value,
    ...activeWithinParams.value,
    ...hasPublishedParams.value,
    ...hasEditsParams.value,
  }));

  const hasActiveFilters = computed(() =>
    Object.entries(filterDefaults).some(
      ([name, defaultValue]) => (route.query[name] ?? defaultValue) !== defaultValue,
    ),
  );

  function clearFilters() {
    updateQueryParams(pick(route.query, tableStateQueryParams));
  }

  const { pagination, loading, loadItems } = useTable({
    fetchFunc: fetchParams => store.dispatch('userAdmin/loadUsers', fetchParams),
    filterFetchQueryParams,
  });

  const selectAll = computed({
    get: () =>
      selected.value.length > 0 && selected.value.length === users.value.length && !loading.value,
    set: checked => {
      selected.value = checked ? users.value : [];
    },
  });

  function headersFor(stackedForMobile) {
    const selectionColumn = stackedForMobile ? [{ class: 'first', sortable: false }] : [];
    return [
      ...selectionColumn,
      {
        text: nameHeader$(),
        align: 'left',
        value: 'last_name',
        class: stackedForMobile ? '' : 'first',
      },
      { text: emailHeader$(), value: 'email' },
      { text: diskSpaceHeader$(), value: 'disk_space' },
      { text: canEditHeader$(), value: 'edit_count', sortable: false },
      { text: canViewHeader$(), value: 'view_count', sortable: false },
      { text: dateJoinedHeader$(), value: 'date_joined' },
      { text: lastActiveHeader$(), value: 'last_login' },
      { text: actionsHeader$(), sortable: false, align: 'center' },
    ];
  }

  async function onDownloadCSV() {
    store.dispatch('showSnackbarSimple', generatingCSVMessage$());
    try {
      const response = await client.get(window.Urls.admin_users_download_csv(), {
        params: filterFetchQueryParams.value,
        responseType: 'blob',
      });
      saveAs(response.data, `studio_users_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      const noFiltersApplied = error.response && error.response.status === 412;
      store.dispatch(
        'showSnackbarSimple',
        noFiltersApplied ? noFiltersAppliedMessage$() : csvDownloadFailedMessage$(),
      );
    }
  }

  watch(
    () => route.fullPath,
    () => {
      if (route.name === RouteNames.USERS) {
        selected.value = [];
      }
    },
  );

  watch(
    () => users.value.length,
    () => {
      selected.value = [];
    },
  );

  onMounted(() => {
    updateTabTitle(tabTitle$());
    locationFilterMap.value = buildLocationFilterMap(locationDropdown.value.options);
  });

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
