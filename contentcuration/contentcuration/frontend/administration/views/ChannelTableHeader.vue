<template>

  <v-container fluid grid-list-xl>
    <v-layout wrap align-center justify-end>
      <v-flex shrink>
        <h1>{{ totalItems }} Channels</h1>
      </v-flex>
      <v-flex grow>
        <ChannelActionsBulk :selected="selected" />
      </v-flex>
      <v-flex md3 d-flex>
        <v-select
          v-model="pagination.filter"
          :items="filterTypes"
          item-text="label"
          item-value="key"
          label="Channel Type"
          @change="filter"
        />
      </v-flex>
      <v-flex xs12 md4>
        <v-text-field
          v-model="pagination.search"
          label="Search for a channel..."
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

  import { filterMixin } from '../mixins';
  import { channelFilterTypes } from '../constants';
  import ChannelActionsBulk from './ChannelActionsBulk';

  export default {
    name: 'ChannelTableHeader',
    components: { ChannelActionsBulk },
    mixins: [filterMixin],
    props: {
      pagination: Object,
      selected: Array,
      totalItems: Number,
    },
    data: () => ({
      searchQuery: '',
      filterTypes: channelFilterTypes,
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

  .container {
    padding: 0;
  }

</style>
