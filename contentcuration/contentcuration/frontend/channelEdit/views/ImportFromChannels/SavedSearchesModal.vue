<template>

  <VDialog
    persistent
    :value="isOpen"
    width="50%"
    @keydown.esc="handleCancel"
  >
    <VCard v-if="!editedSearch" class="pa-2">
      <VCardTitle>
        <h2>{{ $tr('savedSearchesTitle') }}</h2>
      </VCardTitle>

      <VCardText>
        <VList>
          <p v-if="items.length === 0">
            {{ $tr('noSavedSearches') }}
          </p>
          <template
            v-for="(item, index) in items"
          >
            <VListTile
              :key="index"
              class="py-2"
            >
              <VListTileContent>
                <VListTileTitle>
                  <RouterLink :to="searchResultsRoute(item)">
                    {{ item.searchTerm }}
                  </RouterLink>
                </VListTileTitle>
                <VListTileSubTitle>
                  {{ item.timestamp }}
                </VListTileSubTitle>
              </VListTileContent>

              <VListTileAction>
                <VBtn
                  fab
                  small
                  flat
                  :title="$tr('editAction')"
                  @click="handleClickEdit(item)"
                >
                  <VIcon>create</VIcon>
                </VBtn>
              </VListTileAction>

              <VListTileAction>
                <VBtn
                  fab
                  small
                  flat
                  :title="$tr('deleteAction')"
                  @click="handleClickDelete(item)"
                >
                  <VIcon>delete</VIcon>
                </VBtn>
              </VListTileAction>
            </VListTile>
            <VDivider :key="index+'divider'" />
          </template>
        </VList>
      </VCardText>

      <VCardActions>
        <VLayout row justify-end>
          <VBtn color="primary" @click="handleCancel">
            {{ $tr('closeAction') }}
          </VBtn>
        </VLayout>
      </VCardActions>

    </VCard>

    <DeleteSearchModal
      v-else-if="editedSearch.delete"
      @submit="editedSearch.callback"
      @cancel="editedSearch = null"
    />

    <EditSearchModal
      v-else
      :editedSearch.sync="editedSearch"
      @submit="handleEditSubmit"
      @cancel="editedSearch = null"
    />

  </VDialog>

</template>


<script>

  import findIndex from 'lodash/findIndex';
  import EditSearchModal from './EditSearchModal';
  import DeleteSearchModal from './DeleteSearchModal';

  export default {
    name: 'SavedSearchesModal',
    inject: ['RouterNames'],
    components: {
      DeleteSearchModal,
      EditSearchModal,
    },
    props: {
      isOpen: {
        type: Boolean,
      },
    },
    data() {
      return {
        editedSearch: null,
        items: [
          {
            id: 1,
            searchTerm: 'Maths',
            timestamp: '1 day ago',
          },
          {
            id: 2,
            searchTerm: 'activties for children in cool places like Hawaii',
            timestamp: '1 day ago',
          },
          {
            id: 3,
            searchTerm: 'khan academy',
            timestamp: '2 days ago',
          },
          {
            id: 4,
            searchTerm: 'lessons',
            timestamp: '2 days ago',
          },
          {
            id: 5,
            searchTerm: 'science',
            timestamp: '10 months ago',
          },
        ],
      };
    },
    methods: {
      handleCancel() {
        this.$emit('cancel');
      },
      handleClickEdit(search) {
        this.editedSearch = { ...search };
      },
      handleEditSubmit(editedSearch) {
        // TODO temp logic
        const editIndex = findIndex(this.items, { id: editedSearch.id });
        this.$set(this.items, editIndex, editedSearch);
        this.editedSearch = null;
      },
      handleClickDelete(deletedSearch) {
        // TODO temp logic
        this.editedSearch = {
          ...deletedSearch,
          delete: true,
          callback: () => {
            this.editedSearch = null;
            this.items = this.items.filter(({ id }) => id !== deletedSearch.id);
            this.$store.dispatch('showSnackbarSimple', this.$tr('searchDeletedSnackbar'));
          },
        };
      },
      searchResultsRoute(savedSearch) {
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_SEARCH,
          params: {
            searchTerm: savedSearch.searchTerm,
          },
        };
      },
    },
    $trs: {
      editAction: 'Edit',
      deleteAction: 'Delete',
      closeAction: 'Close',
      savedSearchesTitle: 'Saved searches',
      noSavedSearches: 'You do not have any saved searches',
      searchDeletedSnackbar: 'Saved search deleted',
    },
  };

</script>


<style lang="scss" scoped></style>
