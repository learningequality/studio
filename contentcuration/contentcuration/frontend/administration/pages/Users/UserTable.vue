<template>

  <div>
    <h1 class="font-weight-bold px-4 py-2 title">
      {{ `${$formatNumber(count)} ${count === 1 ? 'user' : 'users'}` }}
      <IconButton
        v-if="count"
        icon="email"
        class="ma-0"
        :color="$themeTokens.primary"
        :text="`Email ${$formatNumber(count)} ${count === 1 ? 'user' : 'users'}`"
        @click="showMassEmailDialog = true"
      />
      <EmailUsersDialog
        v-model="showMassEmailDialog"
        :query="{ ...$route.query, userTypeFilter }"
      />
    </h1>
    <VLayout
      wrap
      class="mb-2"
    >
      <VFlex
        xs12
        sm4
        xl3
        class="px-3"
      >
        <VSelect
          v-model="userTypeFilter"
          :items="userTypeFilters"
          item-text="label"
          item-value="key"
          label="User Type"
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
        <CountryField
          ref="locationDropdown"
          v-model="locationFilter"
          :outline="false"
          :multiple="false"
          label="Target location"
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
          label="Search for a user..."
          prepend-inner-icon="search"
          clearable
          box
          hint="Search for users by their names, emails, or channels"
          persistent-hint
          @input="setKeywords"
          @click:clear="clearSearch"
        />
      </VFlex>
    </VLayout>
    <VDataTable
      v-model="selected"
      :headers="headers"
      :loading="loading"
      class="table-col-freeze"
      :pagination.sync="pagination"
      :total-items="count"
      :rows-per-page-items="rowsPerPageItems"
      :items="users"
      :no-data-text="loading ? 'Loading...' : 'No users found'"
      :class="{ expanded: $vuetify.breakpoint.mdAndUp }"
    >
      <template #progress>
        <VProgressLinear
          v-if="loading"
          color="loading"
          indeterminate
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
            text="Email"
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
        />
      </template>
    </VDataTable>
    <EmailUsersDialog
      v-model="showEmailDialog"
      :query="{ ids: selected }"
    />
  </div>

</template>


<script>

  import { ref, onMounted } from 'vue';
  import { mapGetters, mapActions } from 'vuex';
  import transform from 'lodash/transform';
  import { RouteNames, rowsPerPageItems } from '../../constants';
  import { tableMixin } from '../../mixins';
  import { useFilter, useKeywordSearch } from '../../composables';
  import EmailUsersDialog from './EmailUsersDialog';
  import UserItem from './UserItem';
  import { routerMixin } from 'shared/mixins';
  import IconButton from 'shared/views/IconButton';
  import Checkbox from 'shared/views/form/Checkbox';
  import CountryField from 'shared/views/form/CountryField';

  const userTypeFilterMap = {
    all: { label: 'All', params: {} },
    active: { label: 'Active', params: { is_active: true } },
    inactive: { label: 'Inactive', params: { is_active: false } },
    administrator: { label: 'Administrators', params: { is_admin: true } },
    sushichef: { label: 'Sushi chef', params: { chef: true } },
  };

  export default {
    name: 'UserTable',
    components: {
      Checkbox,
      IconButton,
      EmailUsersDialog,
      UserItem,
      CountryField,
    },
    mixins: [tableMixin, routerMixin],
    setup() {
      const { filter: userTypeFilter, filters: userTypeFilters } = useFilter(userTypeFilterMap);

      const { keywordInput, setKeywords, clearSearch } = useKeywordSearch();

      const locationFilterMap = ref({});
      const locationDropdown = ref(null);

      const { filter: locationFilter } = useFilter(locationFilterMap);

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

      return {
        userTypeFilter,
        userTypeFilters,
        keywordInput,
        setKeywords,
        clearSearch,
        locationDropdown,
        locationFilter,
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
        const firstColumn = this.$vuetify.breakpoint.smAndDown ? [{ class: 'first' }] : [];
        return firstColumn.concat([
          {
            text: 'Name',
            align: 'left',
            value: 'last_name',
            class: `${this.$vuetify.breakpoint.smAndDown ? '' : 'first'}`,
          },
          { text: 'Email', value: 'email' },
          { text: 'Disk space', value: 'disk_space' },
          { text: 'Can edit', value: 'edit_count' },
          { text: 'Can view', value: 'view_count' },
          { text: 'Date joined', value: 'date_joined' },
          { text: 'Last active', value: 'last_login' },
          { text: 'Actions', sortable: false, align: 'center' },
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
      this.updateTabTitle('Users - Administration');
    },
    methods: {
      ...mapActions('userAdmin', ['loadUsers']),
      /**
       * @public
       * @param params
       * @return {Promise<any>}
       */
      fetch(params) {
        return this.loadUsers(params);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
