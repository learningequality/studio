<template>

  <v-container fluid grid-list-xl>
    <v-layout wrap align-center>
      <v-flex xs12 sm3 d-flex>
        <v-select
          :items="userType"
          item-text="label"
          item-value="value"
          label="Channel Type"
        />
      </v-flex>

      <v-flex xs12 sm3 d-flex>
        <v-select
          :items="sortBy"
          item-text="label"
          item-value="value"
          label="Sort By"
        />
      </v-flex>

      <v-flex xs12 sm3 d-flex>
        <v-select
          :items="order"
          item-text="label"
          item-value="value"
          label="Order"
        />
      </v-flex>

    </v-layout>
  </v-container>

</template>


<script>

  export default {
    name: 'ChannelFilters',
    data: () => ({
      userType: [
        { key: 'all', label: 'All Types' },
        { key: 'active', label: 'Active' },
        { key: 'inactive', label: 'Inactive' },
        { key: 'administrator', label: 'Administrator' },
        { key: 'sushichef', label: 'Sushi Chef' },
      ],
      sortBy: [
        { key: 'joined', label: 'Date Joined' },
        { key: 'email', label: 'Email' },
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'editing', label: 'Channels Editing' },
      ],
      order: [
        { key: 'descending', label: 'Descending' },
        { key: 'ascending', label: 'Ascending' },
      ],
    }),
  };

</script>


<style lang="less" scoped>

  div {
    white-space: nowrap;
  }
  div.label {
    max-width: 8em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v-btn:hover::before,
  .v-btn:focus::before {
    background-color: transparent;
  }

</style>
