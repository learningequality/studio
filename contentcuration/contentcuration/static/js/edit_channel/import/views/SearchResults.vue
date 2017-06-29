<template>

  <div>
    <div>
      Search Results for {{ store.pageState.data.searchTerm }}
      <button @click="goBack">Go Back</button>
    </div>
    <pre>
      {{ JSON.stringify(items, null, 2) }}
    </pre>
  </div>

</template>


<script>

  module.exports = {
    props: ['store'],
    components: {

    },
    data: function() {
      return {
        items: [],
        topics: [],
      }
    },
    computed: {
      searchTerm() {
        return this.store.pageState.data.searchTerm;
      }
    },
    watch: {
      searchTerm() {
          this.fetchSearchResults();
      }
    },
    mounted() {
      this.fetchSearchResults();
    },
    methods: {
      goBack() {
        this.store.goToPreviousPage();
      },
      fetchSearchResults() {
        this.store.fetchItemSearchResults(this.searchTerm)
        .then((results) =>{
          this.items = results;
        });
      },
    },
    vuex: {
      getters: {

      },
      actions: {

      },
    },
  }

</script>


<style lang="less" scoped>

</style>
