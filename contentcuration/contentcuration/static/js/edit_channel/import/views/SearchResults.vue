<template>

  <div class="SearchResults">
    <div>
      Search Results for {{ store.pageState.data.searchTerm }}
      <button @click="goBack">Go Back</button>
    </div>
    <div>
      <h1>Items</h1>
      <div v-show="items.length === 0">
        No documents, exercises, or other files matching "{{ this.searchTerm }}"
      </div>
      <ul class="list-unstyled">
        <ImportListItem
          v-for="item in items"
          :key="item.id"
          :node="item"
          :isFolder="false"
          :isChannel="false"
          :isRoot="true"
          :parentIsChecked="false"
          :store="store"
        />
      </ul>
    </div>
    <div>
      <h1>Topics</h1>
      <div v-show="topics.length === 0">
        No topics matching "{{ this.searchTerm }}"
      </div>
      <ul class="list-unstyled">
        <ImportListItem
          v-for="topic in topics"
          :key="topic.id"
          :node="topic"
          :isFolder="true"
          :isChannel="false"
          :isRoot="true"
          :parentIsChecked="false"
          :store="store"
        />
      </ul>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: ['store'],
    components: {
      ImportListItem: require('./ImportListItem.vue'),

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
        this.store.fetchTopicSearchResults(this.searchTerm)
        .then((results) =>{
          this.topics = results;
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

  .SearchResults {
    background-color: white;
  }

</style>
