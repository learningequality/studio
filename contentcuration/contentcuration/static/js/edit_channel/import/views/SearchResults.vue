<template>

  <div class="SearchResults">
    <div>
      <p v-show="!resultsLoading" class="TopResults wordwrap">
        {{ $tr('showingResultsText', {currentSearchTerm: currentSearchTerm}) }}
      </p>
      <button @click="goToPreviousPage()" class="button-reset BackButton">
        {{ $tr('backToBrowseButton') }}
      </button>
    </div>

    <!-- ITEM RESULTS -->
    <div class="Results">
      <h1 class="Results__Header">{{ $tr('resourcesLabel') }}</h1>
      <span v-if="resultsLoading" class="LoadingMsg wordwrap">
        {{ $tr('loadingResultsText', {currentSearchTerm: currentSearchTerm}) }}
      </span>
      <template v-else>
        <div v-show="itemResults.length === 0" class="wordwrap">
          {{ $tr('noContentFoundText', {currentSearchTerm: currentSearchTerm}) }}
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
      <h1 class="Results__Header">{{ $tr('topicsLabel') }}</h1>
      <span v-if="resultsLoading" class="LoadingMsg wordwrap">
        {{ $tr('loadingResultsText', {currentSearchTerm: currentSearchTerm}) }}
      </span>
      <template v-else>
        <div v-show="topicResults.length === 0" class="wordwrap">
          {{ $tr('noTopicsText', {currentSearchTerm: currentSearchTerm}) }}
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

import { mapGetters, mapActions } from 'vuex';
import { fetchSearchResults } from '../util';
import ImportListItem from './ImportListItem.vue';

export default {
  name: 'SearchResults',
  $trs: {
    'showingResultsText': "Showing top results for \"{currentSearchTerm}\"",
    'loadingResultsText': "Loading results for \"{currentSearchTerm}\"...",
    'backToBrowseButton': "Go Back To Browse",
    'resourcesLabel': "Resources",
    'noContentFoundText': "No documents, exercises, or other files matching \"{ currentSearchTerm }\"",
    'topicsLabel': "Topics",
    'noTopicsText': "No topics matching \"{ currentSearchTerm }\""
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
  computed: mapGetters('import', [
    'currentSearchTerm',
    'currentChannelId',
  ]),
  watch: {
    currentSearchTerm() {
      this.updateResults();
    }
  },
  mounted() {
    this.updateResults();
  },
  methods: Object.assign(
    mapActions('import', ['goToPreviousPage']),
    {
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
    }
  ),
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
