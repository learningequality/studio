<template>
  <VContainer>
    Details View Only
  </VContainer>
</template>

<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'DetailsViewOnlyView',
    $trs: {
      // selectAllLabel: 'Select All'
    },
    computed: {
      ...mapGetters('edit_modal', ['selected']),
    },
  };

</script>

<style lang="less" scoped>

</style>
