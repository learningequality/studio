<template>

  <VPagination
    v-if="totalPages > 1"
    v-model="page"
    color="primary"
    class="notranslate"
    :length="totalPages"
  />

</template>
<script>

  export default {
    name: 'Pagination',
    props: {
      totalPages: {
        type: Number,
        default: 0,
      },
    },
    computed: {
      page: {
        get() {
          return Number(this.$route.query.page) || 1;
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: {
              ...this.$route.query,
              page: value,
            },
          });
        },
      },
    },
  };

</script>