<template>

  <VContainer fluid grid-list-xl>
    <VLayout wrap align-center justify-end>
      <VFlex shrink>
        <h1>{{ totalItems }} Channels</h1>
      </VFlex>
      <VFlex grow>
        <ChannelTableActions :selected="selected" />
      </VFlex>
      <VFlex md3 d-flex>
        <VSelect
          v-model="pagination.filter"
          :items="filterTypes"
          item-text="label"
          item-value="key"
          label="Channel Type"
          @change="filter"
        />
      </VFlex>
      <VFlex xs12 md4>
        <VTextField
          v-model="pagination.search"
          label="Search for a channel..."
          prepend-inner-icon="search"
          clearable

          @change="search"
          @click:clear="clearSearch"
        />
      </VFlex>

    </VLayout>
  </VContainer>

</template>


<script>

  import { filterMixin } from '../../mixins';
  import { channelFilterTypes } from '../../constants';
  import ChannelTableActions from './ChannelTableActions';

  export default {
    name: 'ChannelTableHeader',
    components: { ChannelTableActions },
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
