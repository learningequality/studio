<template>

  <v-container fluid grid-list-xl>
    <v-layout wrap align-center justify-end>
      <v-flex shrink>
        <h1>{{ totalItems }} Users</h1>
      </v-flex>
      <v-flex grow>
        <UserActionsBulk :selected="selected" />
      </v-flex>
      <v-flex md3 d-flex>
        <v-select
          v-model="pagination.filter"
          :items="filterTypes"
          item-text="label"
          item-value="key"
          label="User Type"
          @change="filter"
        />
      </v-flex>
      <v-flex xs12 md4>
        <v-text-field
          v-model="pagination.search"
          label="Search for a user..."
          prepend-inner-icon="search"
          clearable
          @change="search"
          @click:clear="clearSearch"
        />
      </v-flex>

    </v-layout>
  </v-container>

</template>


<script>

  import { filterMixin } from '../../mixins';
  import { userFilterTypes } from '../../constants';
  import UserActionsBulk from './UserActionsBulk';

  export default {
    name: 'UserTableHeader',
    components: { UserActionsBulk },
    mixins: [filterMixin],
    props: {
      pagination: Object,
      selected: Array,
      totalItems: Number,
    },
    data: () => ({
      filterTypes: userFilterTypes,
    }),
  };

</script>

<style lang="less" scoped>

  .container {
    padding: 0;
  }

</style>
