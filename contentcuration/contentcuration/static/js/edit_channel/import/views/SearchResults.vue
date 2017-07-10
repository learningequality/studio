<template>

  <div class="SearchResults">
    <div>
      <p v-show="!resultsLoading" class="TopResults wordwrap">
        Showing top results for "{{ currentSearchTerm }}"
      </p>
      <button @click="goToPreviousPage()" class="button-reset BackButton">
        Go Back To Browse
      </button>
    </div>

    <!-- ITEM RESULTS -->
    <div class="Results">
      <h1 class="Results__Header">Items</h1>
      <span v-if="resultsLoading" class="LoadingMsg wordwrap">
        Loading results for "{{ currentSearchTerm }}"...
      </span>
      <template v-else>
        <div v-show="itemResults.length === 0" class="wordwrap">
          No documents, exercises, or other files matching "{{ currentSearchTerm }}"
        </div>
        <ul class="list-unstyled Results__List">
          <ImportListItem
            v-for="item in itemResults"
            :key="item.id"
            :node="item"
            :isFolder="false"
            :isChannel="false"
            :isRoot="true"
            :parentIsChecked="false"
            :store="store"
          />
        </ul>
      </template>
    </div>

    <!-- TOPIC RESULTS -->
    <div class="Results">
      <h1 class="Results__Header">Topics</h1>
      <span v-if="resultsLoading" class="LoadingMsg wordwrap">
        Loading results for "{{ currentSearchTerm }}"...
      </span>
      <template v-else>
        <div v-show="topicResults.length === 0" class="wordwrap">
          No topics matching "{{ currentSearchTerm }}"
        </div>
        <ul class="list-unstyled Results__List">
          <ImportListItem
            v-for="topic in topicResults"
            :key="topic.id"
            :node="topic"
            :isFolder="true"
            :isChannel="false"
            :isRoot="true"
            :parentIsChecked="false"
            :store="store"
          />
        </ul>
      </template>
    </div>
  </div>

</template>


<script>

const { mapGetters, mapActions } = require('vuex');
const { fetchSearchResults } = require('../util');

module.exports = {
  components: {
    ImportListItem: require('./ImportListItem.vue'),
  },
  data() {
    return {
      itemResults: [],
      topicResults: [],
      resultsLoading: false,
    };
  },
  computed: {
    ...mapGetters('import', [
      'currentSearchTerm',
      'currentChannelId',
    ]),
  },
  watch: {
    currentSearchTerm() {
      this.updateResults();
    }
  },
  mounted() {
    this.updateResults();
  },
  methods: {
    ...mapActions('import', ['goToPreviousPage']),
    updateResults() {
      if (this.currentSearchTerm.length < 3) return;
      this.resultsLoading = true;
      return fetchSearchResults(this.currentSearchTerm, this.currentChannelId)
      .then(({ itemResults, topicResults, searchTerm }) => {
        if (searchTerm === this.currentSearchTerm) {
          this.resultsLoading = false;
          this.itemResults = itemResults;
          this.topicResults = topicResults;
        }
      });
    },
  },
}

</script>


<style lang="less" scoped>

.SearchResults {
  padding: .5rem;
}

.LoadingMsg {
  font-style: italic;
}

.Results__List {
  background-color: white;
  max-height: 200px;
  overflow-y: scroll;
}

.Results__Header {
  font-size: 2rem;
  color: white;
  background-color: #54ACF2;
  padding: .5rem;
  text-transform: uppercase;
}

.TopResults {
  font-weight: bold;
}

.BackButton {
  color: #2196F3;
  text-decoration: underline;
}

.button-reset {
  -webkit-appearance: none;
  border: none;
  background: none;
}

</style>
