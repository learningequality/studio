<template>

  <div>
    <button>
      Back
    </button>

    <div>
      <div class="resources-msg">
        N Total Resources Selected (M MB)
      </div>
      <div class="resources-list">
        <ul class="list-unstyled">
          <ImportListItem
            v-for="item in itemsToImport"
            :key="item.id"
            :node="item"
            :isChannel="false"
            :readOnly="true"
            :isFolder="item.children.length > 0"
          />
        </ul>
      </div>
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import ImportListItem from './ImportListItem.vue';

  export default {
    name: 'ImportPreview',
    components: {
      ImportListItem,
    },
    computed: mapState('import', [
      'itemsToImport',
    ]),
    methods: {

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
