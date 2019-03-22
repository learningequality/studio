<template>
  <div class="search-results">
    <div>
      <p v-show="!resultsLoading" class="top-results wordwrap">
        {{ $tr('showingResultsText', {currentSearchTerm: currentSearchTerm}) }}
      </p>
      <button class="button-reset back-button" @click="goToPreviousPage()">
        {{ $tr('backToBrowseButton') }}
      </button>
    </div>

    <!-- ITEM RESULTS -->
    <div class="results">
      <h1 class="results-header">
        {{ $tr('resourcesLabel') }}
      </h1>
      <span v-if="resultsLoading" class="loading-msg wordwrap">
        {{ $tr('loadingResultsText', {currentSearchTerm: currentSearchTerm}) }}
      </span>
      <template v-else>
        <div v-show="itemResults.length === 0" class="wordwrap">
          {{ $tr('noContentFoundText', {currentSearchTerm: currentSearchTerm}) }}
        </div>
        <ul class="list-unstyled results-list">
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
    <div class="results">
      <h1 class="results-header">
        {{ $tr('topicsLabel') }}
      </h1>
      <span v-if="resultsLoading" class="loading-msg wordwrap">
        {{ $tr('loadingResultsText', {currentSearchTerm: currentSearchTerm}) }}
      </span>
      <template v-else>
        <div v-show="topicResults.length === 0" class="wordwrap">
          {{ $tr('noTopicsText', {currentSearchTerm: currentSearchTerm}) }}
        </div>
        <ul class="list-unstyled results-list">
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

  import { mapGetters, mapActions } from 'vuex';
  import { fetchSearchResults } from '../util';
  import ImportListItem from './ImportListItem.vue';

  export default {
    name: 'SearchResults',
    $trs: {
      showingResultsText: 'Showing top results for "{currentSearchTerm}"',
      loadingResultsText: 'Loading results for "{currentSearchTerm}"...',
      backToBrowseButton: 'Go Back To Browse',
      resourcesLabel: 'Resources',
      noContentFoundText:
        'No documents, exercises, or other files matching "{ currentSearchTerm }"',
      topicsLabel: 'Topics',
      noTopicsText: 'No topics matching "{ currentSearchTerm }"',
    },
    components: {
      ImportListItem,
    },
    data() {
      return {
        itemResults: [],
        topicResults: [],
        resultsLoading: false,
      };
    },
    computed: mapGetters('import', ['currentSearchTerm', 'currentChannelId']),
    watch: {
      currentSearchTerm() {
        this.updateResults();
      },
    },
    mounted() {
      this.updateResults();
    },
    methods: Object.assign(mapActions('import', ['goToPreviousPage']), {
      updateResults() {
        if (this.currentSearchTerm.length < 3) return;
        this.resultsLoading = true;
        return fetchSearchResults(this.currentSearchTerm, this.currentChannelId).then(
          ({ itemResults, topicResults, searchTerm }) => {
            if (searchTerm === this.currentSearchTerm) {
              this.resultsLoading = false;
              this.itemResults = itemResults;
              this.topicResults = topicResults;
            }
          }
        );
      },
    }),
  };

</script>


<style lang="less" scoped>

  .search-results {
    padding: 0.5rem;
  }

  .loading-msg {
    font-style: italic;
  }

  .results-list {
    overflow-y: auto;
    background-color: white;
  }

  .results-header {
    padding: 0.5rem;
    font-size: 2rem;
    color: white;
    text-transform: uppercase;
    background-color: #54acf2;
  }

  .top-results {
    font-weight: bold;
  }

  .back-button {
    color: #2196f3;
    text-decoration: underline;
  }

  .button-reset {
    background: none;
    border: 0;
    appearance: none;
  }

</style>
