<template>

  <div
    class="notifications-filters"
    :class="{ disabled }"
  >
    <KTextbox
      v-model="keywordInput"
      clearable
      class="notifications-keyword-search"
      :label="searchNotificationsLabel$()"
      :clearLabel="commonStrings.clearAction$()"
      :appearanceOverrides="{ maxWidth: 'none' }"
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
    <KSelect
      v-model="dateFilter"
      clearable
      :label="filterByDateLabel$()"
      :options="dateOptions"
    />
    <KSelect
      v-model="communityLibraryStatusFilter"
      clearable
      :label="filterByStatusLabel$()"
      :options="communityLibraryStatusOptions"
    />
  </div>

</template>


<script setup>

  import { computed, watch } from 'vue';
  import isEqual from 'lodash/isEqual';
  import { useFilter } from 'shared/composables/useFilter';
  import { useKeywordSearch } from 'shared/composables/useKeywordSearch';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { CommunityLibraryStatus } from 'shared/constants';

  defineProps({
    disabled: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['update:filters']);

  const {
    searchNotificationsLabel$,
    filterByDateLabel$,
    todayLabel$,
    thisWeekLabel$,
    thisMonthLabel$,
    thisYearLabel$,
    filterByStatusLabel$,
    pendingStatus$,
    approvedStatus$,
    flaggedStatus$,
  } = communityChannelsStrings;

  function getStartOfWeek() {
    const date = new Date();
    const day = date.getDay();
    // Setting first day of the week to Monday
    const diff = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(date.setDate(date.getDate() - diff));
    return startOfWeek.toISOString().split('T')[0];
  }

  function getStartOfMonth() {
    const date = new Date();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return startOfMonth.toISOString().split('T')[0];
  }

  function getStartOfYear() {
    const date = new Date();
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    return startOfYear.toISOString().split('T')[0];
  }

  const DateFilterMap = {
    today: {
      label: todayLabel$(),
      params: {
        date_updated__gte: new Date().toISOString().split('T')[0],
      },
    },
    this_week: {
      label: thisWeekLabel$(),
      params: {
        date_updated__gte: getStartOfWeek(),
      },
    },
    this_month: {
      label: thisMonthLabel$(),
      params: {
        date_updated__gte: getStartOfMonth(),
      },
    },
    this_year: {
      label: thisYearLabel$(),
      params: {
        date_updated__gte: getStartOfYear(),
      },
    },
  };

  const CommunityLibraryStatusFilterMap = {
    pending: {
      label: pendingStatus$(),
      params: {
        // Not taking into account SUPERSEDED, because those are not pending of any action
        status__in: CommunityLibraryStatus.PENDING,
      },
    },
    approved: {
      label: approvedStatus$(),
      params: {
        status__in: [CommunityLibraryStatus.APPROVED, CommunityLibraryStatus.LIVE].join(','),
      },
    },
    flagged: {
      label: flaggedStatus$(),
      params: { status__in: CommunityLibraryStatus.REJECTED },
    },
  };

  const {
    filter: dateFilter,
    options: dateOptions,
    fetchQueryParams: dateFetchQueryParams,
  } = useFilter({
    name: 'date_filter',
    filterMap: DateFilterMap,
  });

  const {
    filter: communityLibraryStatusFilter,
    options: communityLibraryStatusOptions,
    fetchQueryParams: communityLibraryStatusFetchQueryParams,
  } = useFilter({
    name: 'community_library_status',
    filterMap: CommunityLibraryStatusFilterMap,
  });

  const {
    keywordInput,
    setKeywords,
    fetchQueryParams: keywordSearchFetchQueryParams,
  } = useKeywordSearch({ name: 'notification_keywords' });

  const notificationsFilters = computed(() => {
    return {
      ...dateFetchQueryParams.value,
      ...communityLibraryStatusFetchQueryParams.value,
      ...keywordSearchFetchQueryParams.value,
    };
  });

  watch(
    notificationsFilters,
    (newFilters, oldFilters) => {
      if (isEqual(newFilters, oldFilters)) {
        return;
      }
      emit('update:filters', newFilters);
    },
    // Immediate to emit initial filters values on mount
    { immediate: true },
  );

</script>


<style lang="scss" scoped>

  .notifications-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    grid-auto-rows: 1fr;
    gap: 6px 12px;

    &.disabled {
      pointer-events: none;
      opacity: 0.7;
    }

    /* TODO: Open a KDS follow up to fix KTextbox feedback message alignment */
    ::v-deep .ui-textbox-feedback {
      display: none;
    }
  }

  .search-icon {
    position: relative;
    left: 4px;
    margin: 4px;
    font-size: 24px;
  }

</style>
