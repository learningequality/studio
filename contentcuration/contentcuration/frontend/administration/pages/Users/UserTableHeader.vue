<template>

  <VContainer fluid grid-list-xl>
    <VLayout wrap align-center justify-end>
      <VFlex shrink>
        <h1>{{ totalItems }} Users</h1>
      </VFlex>
      <VFlex grow>
        <UserTableActions :selected="selected" />
      </VFlex>
      <VFlex md3 d-flex>
        <VSelect
          v-model="pagination.filter"
          :items="filterTypes"
          item-text="label"
          item-value="key"
          label="User Type"
          @change="filter"
        />
      </VFlex>
      <VFlex xs12 md4>
        <VTextField
          v-model="pagination.search"
          label="Search for a user..."
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
  import { userFilterTypes } from '../../constants';
  import UserTableActions from './UserTableActions';

  export default {
    name: 'UserTableHeader',
    components: { UserTableActions },
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
