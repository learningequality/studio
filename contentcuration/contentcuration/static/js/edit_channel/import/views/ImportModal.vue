<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default" id="import_modal_content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title">Import from Another Channel</h4>
          <div>
            <form @submit="noop">
              <input v-model="searchTerm" type="text" placeholder="What are you looking for?"></input>
              <button type="submit" @click.prevent="noop">Search</button>
            </form>
          </div>
        </div>
        <div class="modal-body">
          <component :is="pageType" :store="store" />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      store: {
        type: Object,
        required: true,
      }
    },
    components: {
      ImportDialogue: require('./ImportDialogue.vue'),
      SearchResults: require('./SearchResults.vue'),
    },
    data: function() {
      return {
        searchTerm: '',
      };
    },
    mounted() {
      this.openModal();
    },
    computed: {
      pageType: function() {
        if (this.store.pageState.type === 'tree_view') {
          return 'ImportDialogue';
        } else if (this.store.pageState.type === 'search_results') {
          return 'SearchResults'
        }
      }
    },
    methods: {
      noop() {
        this.store.goToSearchResults(this.searchTerm);
      },
      openModal() {
        $(this.$refs.topmodal).modal({ show: true })
      },
      closeModal() {
        $(this.$refs.topmodal).modal('hide');
      }
    },
  }

</script>


<style lang="less" scoped>

</style>
