<template>

  <VDialog
    fullscreen
    persistent
    scrollable
    :value="true"
    transition="dialog-bottom-transition"
    attach="body"
    app
  >
    <VCard>
      <VToolbar fixed clipped-right color="primary" dark app>
        <VToolbarItems>
          <VBtn flat icon :to="backLink" exact>
            <Icon>clear</Icon>
          </VBtn>
        </VToolbarItems>
        <VToolbarTitle>
          {{ $tr('trashModalTitle') }}
        </VToolbarTitle>
      </VToolbar>
      <VContent>
        <LoadingText v-if="loading" absolute />
        <VContainer v-else-if="!items.length" fluid>
          <h1 class="headline font-weight-bold pt-4 mt-4 text-xs-center">
            {{ $tr('trashEmptyText') }}
          </h1>
          <p class="subheading text-xs-center mt-3">
            {{ $tr('trashEmptySubtext') }}
          </p>
        </VContainer>
        <VContainer
          v-else
          fluid
          class="pa-4"
          style="max-height: calc(100vh - 128px); overflow-y: auto;"
        >
          <VCard style="width: 100%; max-width: 900px; margin: 0 auto;" flat class="pa-2">
            <p class="title mt-4">
              {{ $tr('itemCountText', {count: items.length}) }}
            </p>
            <VDataTable :headers="headers" :items="sortedItems" hide-actions must-sort>
              <template #headerCell="props">
                <VLayout v-if="props.header.selectAll" row align-center>
                  <VFlex shrink>
                    <VCheckbox
                      :value="Boolean(selected.length)"
                      hide-details
                      color="primary"
                      :indeterminate="!!selected.length && selected.length !== items.length"
                      @change="toggleSelectAll"
                    />
                  </VFlex>
                  <VFlex>
                    {{ props.header.text }}
                  </VFlex>
                </VLayout>
                <span v-else>
                  {{ props.header.text }}
                </span>
              </template>
              <template #items="{item}">
                <tr :key="item.id" :style="{backgroundColor: getItemBackground(item.id)}">
                  <td>
                    <VLayout row align-center>
                      <VFlex shrink>
                        <VCheckbox
                          v-model="selected"
                          color="primary"
                          :value="item.id"
                          hide-details
                        />
                      </VFlex>
                      <VFlex shrink class="mx-3">
                        <ContentNodeIcon :kind="item.kind" />
                      </VFlex>
                      <VFlex class="notranslate" grow>
                        <ActionLink
                          :text="item.title"
                          @click="previewNodeId = item.id"
                        />
                      </VFlex>
                    </VLayout>
                  </td>
                  <td class="text-xs-right">
                    {{ $formatRelative(item.modified, { now: new Date() }) }}
                  </td>
                </tr>
              </template>
            </VDataTable>
          </VCard>
        </VContainer>
      </VContent>
      <VExpandXTransition>
        <ResizableNavigationDrawer
          v-if="previewNodeId"
          right
          localName="trash-resource-panel"
          :minWidth="400"
          :maxWidth="700"
          permanent
          app
          clipped
        >
          <div class="pa-4" style="margin-bottom: 64px;">
            <ResourcePanel
              :nodeId="previewNodeId"
              :channelId="currentChannel.id"
              @close="previewNodeId = null"
            />
          </div>
        </ResizableNavigationDrawer>
      </VExpandXTransition>
      <BottomToolBar flat color="white" clipped-right app>
        <VSpacer />
        <span v-if="selected.length" class="mr-4 subheading">
          {{ $tr('selectedCountText', {count: selected.length} ) }}
        </span>
        <VBtn flat :disabled="!selected.length">
          {{ $tr('restoreButton') }}
        </VBtn>
        <VBtn color="primary" :disabled="!selected.length" @click="showConfirmationDialog = true">
          {{ $tr('deleteButton') }}
        </VBtn>
      </BottomToolBar>
      <MessageDialog
        v-model="showConfirmationDialog"
        :header="$tr('deleteConfirmationHeader', {count: selected.length})"
        :text="$tr('deleteConfirmationText')"
      >
        <template #buttons="{close}">
          <VBtn flat @click="close">
            {{ $tr('deleteConfirmationCancelButton') }}
          </VBtn>
          <VBtn color="primary" @click="deleteNodes">
            {{ $tr('deleteConfirmationDeleteButton') }}
          </VBtn>
        </template>
      </MessageDialog>
    </VCard>
  </VDialog>

</template>
<script>

  import { mapActions, mapGetters } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import ResourcePanel from '../../views/ResourcePanel';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import BottomToolBar from 'shared/views/BottomToolBar';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'TrashModal',
    components: {
      ContentNodeIcon,
      BottomToolBar,
      ResizableNavigationDrawer,
      ResourcePanel,
      ActionLink,
      MessageDialog,
    },
    data() {
      return {
        loading: false,
        previewNodeId: null,
        selected: [],
        showConfirmationDialog: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel']),
      headers() {
        return [
          {
            text: this.$tr('selectAllHeader'),
            align: 'left',
            sortable: false,
            selectAll: true,
            value: 'title',
          },
          {
            text: this.$tr('deletedHeader'),
            value: 'modified',
            align: 'right',
            sortable: false,
          },
        ];
      },
      sortedItems() {
        return sortBy(this.items, 'modified').reverse();
      },
      items() {
        return [
          {
            id: 'test1',
            title: 'Item',
            kind: 'video',
            modified: new Date(2020, 1, 20),
          },
          {
            id: 'test2',
            title: 'Item',
            kind: 'audio',
            modified: new Date(2020, 2, 1),
          },
          {
            id: 'test3',
            title: 'Topic',
            kind: 'topic',
            modified: new Date(2020, 1, 1),
          },
        ];
      },
      backLink() {
        return {
          name: this.$route.matched[this.$route.matched.length - 2].name,
          query: this.$route.query,
          params: this.$route.params,
        };
      },
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode']),
      deleteNodes() {
        let text = this.$tr('deleteSuccessMessage', { count: this.selected.length });
        this.selected.forEach(id => {
          this.deleteContentNode(id);
        });
        this.showConfirmationDialog = false;
        this.toggleSelectAll(false);
        this.$store.dispatch('showSnackbar', { text });
      },
      toggleSelectAll(selectAll) {
        this.selected = selectAll ? this.items.map(i => i.id) : [];
      },
      getItemBackground(id) {
        return this.previewNodeId === id ? this.$vuetify.theme.greyBackground : 'transparent';
      },
    },
    $trs: {
      trashModalTitle: 'Removed items',
      trashEmptyText: 'Trash is empty',
      trashEmptySubtext: 'Content removed from channel will appear here',
      selectAllHeader: 'Select all',
      deletedHeader: 'Deleted',
      itemCountText: '{count, plural,\n =1 {# item}\n other {# items}}',
      selectedCountText: '{count, plural,\n =1 {# selection}\n other {# selections}}',
      deleteButton: 'Delete',
      restoreButton: 'Restore',
      deleteConfirmationHeader:
        'Permanently delete {count, plural,\n =1 {# item}\n other {# items}}?',
      deleteConfirmationText: 'Warning: you cannot undo this action.',
      deleteConfirmationDeleteButton: 'Delete permanently',
      deleteConfirmationCancelButton: 'Cancel',
      deleteSuccessMessage: 'Permanently deleted {count, plural,\n =1 {# item}\n other {# items}}',
    },
  };

</script>
<style lang="less" scoped>

</style>
