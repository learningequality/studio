<template>

  <v-pagination
    v-model="page"
    color="primary"
    :length="totalPages"
    :total-visible="7"
  />

</template>
<script>

  export default {
    name: 'Pagination',
    props: {
      totalPages: {
        type: Number,
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
