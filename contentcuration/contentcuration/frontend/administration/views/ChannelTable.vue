<template>

  <div>
    <h1>{{ totalCount }} Channels</h1>
    <ChannelFilters />
    <!--

  ('id', 'created', 'modified', 'name', 'published', 'editors', 'editors_count',
  'viewers', 'viewers_count', 'staging_tree',
  'description', 'resource_count', 'version', 'public', 'deleted',
  'ricecooker_version', 'download_url', 'primary_token', 'priority')

  -->
    <VDataTable
      :headers="headers"
      :items="channels"
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
        <td>{{ channels.item.primary_token }}</td>
        <td>{{ channels.item.id }}</td>
        <td>{{ channels.item.resource_count }}</td>
        <td>{{ channels.item.editors_count }}</td>
        <td>{{ channels.item.viewers_count }}</td>
        <td>{{ channels.item.priority }}</td>
        <td>{{ channels.item.created }}</td>
        <td>{{ channels.item.modified }}</td>

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
  import ChannelFilters from './ChannelFilters';

  export default {
    name: 'ChannelTable',
    components: {
      ChannelFilters,
    },
    data() {
      return {
        headers: [
          {
            text: 'Channel name',
            align: 'left',
            sortable: false,
            value: 'first_name',
          },

          // ('id', 'created', 'modified', 'name', 'published', 'editors', 'editors_count',
          // 'viewers', 'viewers_count', 'staging_tree',
          // 'description', 'resource_count', 'version', 'public', 'deleted',
          // 'ricecooker_version', 'download_url', 'primary_token', 'priority')

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
      };
    },
    computed: {
      ...mapState({ channels: state => state.channelTable.channels }),
      ...mapState({ totalCount: state => state.channelTable.pageInfo.count }),
    },
    created() {
      this.$store.dispatch('fetchChannels');
    },
  };

</script>


<style lang="less" scoped>
</style>
