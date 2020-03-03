<template>

  <div>
    <h1>{{ totalCount }} Users</h1>
    <UserFilters />

    <VDataTable
      :headers="headers"
      :items="users"
      select-all
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
          <v-btn icon>
            <v-icon>edit</v-icon>
          </v-btn>
        </td>
        <td>
          {{ users.item.editable_channels_count }}
          <v-btn icon>
            <v-icon>launch</v-icon>
          </v-btn>
        </td>
        <td>{{ users.item.view_only_channels_count }}</td>
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

  import { mapState } from 'vuex';
  import UserFilters from './UserFilters';

  export default {
    name: 'UserTable',
    components: {
      UserFilters,
    },
    data() {
      return {
        headers: [
          {
            text: 'User',
            align: 'left',
            sortable: false,
            value: 'first_name',
          },
          { text: 'Email', value: 'email' },
          // { text: 'Organization', value: 'organization' }, // To-do
          { text: 'Disk Space', value: 'disk_space' },
          { text: 'Can Edit', value: 'editable_channels_count' },
          { text: 'Can View', value: 'view_only_channels_count' },
          { text: 'Date Joined', value: 'date_joined' },
          // { text: 'Last Active', value: 'last_active' }, // To-do
          { text: 'Actions' },
        ],
      };
    },
    computed: {
      ...mapState({ users: state => state.userTable.users }),
      ...mapState({ totalCount: state => state.userTable.pageInfo.count }),
    },
    created() {
      this.$store.dispatch('fetchUsers');
    },
  };

</script>


<style lang="less" scoped>
</style>
