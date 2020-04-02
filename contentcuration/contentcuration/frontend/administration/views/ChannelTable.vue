<template>

  <div>
    <h1>{{ totalItems }} Channels</h1>
    <ChannelFilters />

    <VDataTable
      :headers="headers"
      :items="channels"
      :pagination.sync="syncPagination"
      :rows-per-page-items="syncPagination.rowsPerPageItems"
      :total-items="totalItems"

      select-all
    >
      <template v-slot:items="channels">
        <td>
          <v-checkbox
            :input-value="channels.selected"
            primary
            hide-details
          />
        </td>
        <td>{{ channels.item.name }}</td>
        <td><ClipboardChip :value="channels.item.primary_token" /></td>
        <td><ClipboardChip :value="channels.item.id" /></td>
        <td>{{ channels.item.resource_count }}</td>
        <td>
          {{ channels.item.editors_count }}
          <v-btn icon small>
            <v-icon small>
              open_in_new
            </v-icon>
          </v-btn>
        </td>
        <td>{{ channels.item.viewers_count }}</td>
        <td>{{ channels.item.priority }}</td>
        <td>
          {{ $formatDate(channels.item.created, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) }}
        </td>
        <td>
          {{ $formatDate(channels.item.modified, {
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
                v-for="(action, index) in actions"
                :key="index"
                @click="action.perform(channels.item)"
              >
                <v-list-tile-title>{{ action.label }}</v-list-tile-title>
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
  import ChannelFilters from './ChannelFilters';
  import ClipboardChip from './ClipboardChip';

  export default {
    name: 'ChannelTable',
    components: {
      ChannelFilters,
      ClipboardChip,
    },
    props: {
      pagination: Object,
    },
    data() {
      return {
        headers: [
          {
            text: 'Channel name',
            align: 'left',
            value: 'name',
          },

          { text: 'Token ID', value: 'primary_token' },
          // { text: 'Organization', value: 'organization' }, // To-do
          { text: 'Channel ID', value: 'id' },
          { text: 'Size', value: 'resource_count' },
          { text: 'Editors', value: 'editors_count' },
          { text: 'Viewers', value: 'viewers_count' },
          { text: 'Priority', value: 'priority' },
          { text: 'Date created', value: 'created' },
          { text: 'Last updated', value: 'modified' },
          // { text: 'Last Active', value: 'last_active' }, // To-do
          { text: 'Actions' },
        ],
        actions: [
          // { label: 'log', perform: console.log },
          // { label: 'alert', perform: window.alert },
        ],
      };
    },
    computed: {
      ...mapGetters('channelTable', ['channels', 'totalItems']),
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
      ...mapActions('channelTable', ['fetch']),
    },
  };

</script>


<style lang="less" scoped>
</style>
