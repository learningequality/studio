<template>

  <div>
    <h1>{{ totalItems }} Users</h1>
    <UserFilters />

    <VDataTable
      :headers="headers"
      :items="users"
      :pagination.sync="syncPagination"
      :rows-per-page-items="syncPagination.rowsPerPageItems"
      :total-items="totalItems"
    >
      <template v-slot:items="users">
        <td>
          <v-checkbox
            :input-value="users.selected"
            primary
            hide-details
          />
        </td>
        <td>{{ users.item.name }}</td>
        <td>{{ users.item.email }}</td>
        <td>
          {{ users.item.mb_space.size +' '+ users.item.mb_space.unit }}
          <v-btn icon small right>
            <v-icon small>
              edit
            </v-icon>
          </v-btn>
        </td>
        <td>
          {{ users.item.editable_users_count }}
          <v-btn icon small>
            <v-icon small>
              launch
            </v-icon>
          </v-btn>
        </td>
        <td>{{ users.item.view_only_users_count }}</td>
        <td>
          {{ $formatDate(users.item.date_joined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) }}
        </td>
        <td>
          <VMenu>
            <template v-slot:activator="{ on }">
              <v-btn
                color="primary"
                light
                flat
                v-on="on"
              >
                actions
              </v-btn>
            </template>
            <v-list>
              <v-list-tile
                v-for="(item, index) in items"
                :key="index"
                @click="openItem(item)"
              >
                <v-list-tile-title>{{ item.title }}</v-list-tile-title>
              </v-list-tile>
            </v-list>
          </VMenu>
        </td>
      </template>
    </VDataTable>

  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { paginationFromRoute, queryFromPagination } from '../router';
  import UserFilters from './UserFilters';

  export default {
    name: 'UserTable',
    components: {
      UserFilters,
    },
    props: {
      pagination: Object,
    },
    data() {
      return {
        headers: [
          {
            text: 'User',
            align: 'left',
            value: 'last_name',
          },
          { text: 'Email', value: 'email' },
          // { text: 'Organization', value: 'organization' }, // To-do
          { text: 'Disk Space', value: 'disk_space' },
          { text: 'Can Edit', value: 'editable_users_count' },
          { text: 'Can View', value: 'view_only_users_count' },
          { text: 'Date Joined', value: 'date_joined' },
          // { text: 'Last Active', value: 'last_active' }, // To-do
          { text: 'Actions' },
        ],
      };
    },
    computed: {
      ...mapGetters('userTable', ['users', 'totalItems']),
      syncPagination: {
        get: function() {
          // console.log('getting pagination', this.pagination);
          return this.pagination;
        },
        set: function(pagination) {
          this.$router
            .push({
              query: queryFromPagination(pagination),
              name: this.$router.currentRoute.name,
            })
            .catch(error => {
              if (error.name != 'NavigationDuplicated') {
                throw error;
              }
            });
        },
      },
    },
    beforeRouteUpdate(to, from, next) {
      // console.log('attempting to navigate to ...', paginationFromRoute(to));
      this.fetch(paginationFromRoute(to)).then(() => {
        next();
      });
    },
    created() {
      this.fetch(this.pagination);
    },
    methods: {
      ...mapActions('userTable', ['fetch']),
    },
  };

</script>


<style lang="less" scoped>
</style>
