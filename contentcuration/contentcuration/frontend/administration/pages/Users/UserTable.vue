<template>

  <div>
    <UserTableHeader
      :selected="selected"
      :totalItems="totalItems"
      :pagination="syncPagination"
    />

    <div id="data-table" :class="whilePinnedClass">
      <VDataTable
        v-model="selected"
        :headers="referenceColumns"
        class="reference-columns"
        :pagination.sync="syncPagination"
        :total-items="totalItems"
        :rows-per-page-items="syncPagination.rowsPerPageItems"
        :items="users"
        no-data-text=""
        select-all
        hide-actions
      >
        <template v-slot:items="users">
          <tr :class="classList(users.item)">
            <td>
              <VCheckbox
                v-model="users.selected"
                primary
                hide-details
              />
            </td>
            <td class="reference">
              <RouterLink :to="userLink(users.item)">
                {{ users.item.name }}
              </RouterLink>
            </td>
          </tr>
        </template>
      </VDataTable>
      <VDataTable
        v-model="selected"
        :headers="mainColumns"
        class="main-columns"
        :items="users"
        :pagination.sync="syncPagination"
        :rows-per-page-items="syncPagination.rowsPerPageItems"
        :total-items="totalItems"
      >
        <template v-slot:items="users">
          <tr :class="classList(users.item)">
            <td class="hide-while-pinned">
              <RouterLink :to="userLink(users.item)">
                {{ users.item.name }}
              </RouterLink>
            </td>
            <td>{{ users.item.email }}</td>
            <td>
              <v-edit-dialog
                lazy
              >
                {{ users.item.mb_space.size +' '+ users.item.mb_space.unit }}
              &nbsp;
                <VBtn icon small right class="edit-space">
                  <VIcon small>
                    edit
                  </VIcon>
                </VBtn>
                <template v-slot:input>
                  <VLayout row wrap>
                    <VTextField
                      v-model="users.item.mb_space.size"
                      label="Size"
                      single-line
                      class="space-size"
                      type="number"
                    />
                    <VSelect
                      v-model="users.item.mb_space.unit"
                      class="space-unit"
                      :items="['MB', 'GB']"
                    />
                  </VLayout>
                </template>
              </v-edit-dialog>
            </td>
            <td>
              {{ users.item.editable_channels_count }}
              <VBtn icon small :to="searchUserEditableChannelsLink(users.item)" target="_blank">
                <VIcon small>
                  launch
                </VIcon>
              </VBtn>
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
              <UserActionsDropdown :user="users.item" />
            </td>
          </tr>
        </template>
      </VDataTable>
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import tableMixin from '../../tableMixin';
  import { paginationFromRoute } from '../../router';
  import UserTableHeader from './UserTableHeader';
  import UserActionsDropdown from './UserActionsDropdown';

  export default {
    name: 'UserTable',
    components: {
      UserTableHeader,
      UserActionsDropdown,
    },
    mixins: [tableMixin],
    data() {
      return {
        selected: [],
        // eslint-disable-next-line kolibri/vue-no-unused-properties
        pagination: paginationFromRoute(this.$router.currentRoute),
        // eslint-disable-next-line kolibri/vue-no-unused-properties
        headers: [
          {
            text: 'Name',
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
          { text: '', sortable: false },
        ],
      };
    },
    computed: {
      ...mapGetters('userTable', ['users', 'totalItems']),
    },
    methods: {
      // eslint-disable-next-line kolibri/vue-no-unused-vuex-methods
      ...mapActions('userTable', ['fetch']),
      classList({ is_active, is_admin, is_chef }) {
        return { active: is_active, admin: is_admin, chef: is_chef };
      },
    },
  };

</script>

<style lang="less" scoped>

  tr.inactive td {
    color: red !important;
  }

  .space-size {
    width: 5em;
  }

  .space-unit {
    width: 3em;
    padding-left: 0.5em;
  }

</style>
