<template>

  <VDialog
    fullscreen
    persistent
    scrollable
    :value="showDialog"
    transition="dialog-bottom-transition"
    attach="body"
    app
  >
    <VCard>
      <router-view />
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
      <VContent style="padding-top: 64px;">
        <VLayout row>
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
              <VDataTable :headers="headers" :items="items" hide-actions must-sort>
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
          <ResourceDrawer
            style="margin-top: 64px;"
            :nodeId="previewNodeId"
            :channelId="currentChannel.id"
            app
            @close="previewNodeId = null"
          />
        </VLayout>
      </VContent>
      <BottomToolBar flat color="white" clipped-right app>
        <VSpacer />
        <span v-if="selected.length" class="mr-4 subheading">
          {{ $tr('selectedCountText', {count: selected.length} ) }}
        </span>
        <VBtn flat :disabled="!selected.length" @click="restoreItems">
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

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import { RouterNames } from '../../constants';
  import ResourceDrawer from '../../components/ResourceDrawer';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import BottomToolBar from 'shared/views/BottomToolBar';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import MessageDialog from 'shared/views/MessageDialog';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'TrashModal',
    components: {
      ContentNodeIcon,
      BottomToolBar,
      ResourceDrawer,
      ActionLink,
      MessageDialog,
      LoadingText,
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
      ...mapGetters('currentChannel', ['currentChannel', 'trashId']),
      ...mapGetters('contentNode', ['getContentNodeChildren']),
      showDialog() {
        return this.$route.name === RouterNames.TRASH;
      },
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
      items() {
        return sortBy(this.getContentNodeChildren(this.trashId), 'modified').reverse();
      },
      backLink() {
        return {
          name: this.$route.matched[this.$route.matched.length - 2].name,
          query: this.$route.query,
          params: this.$route.params,
        };
      },
    },
    mounted() {
      this.loading = true;
      this.loadContentNode(this.trashId).then(() => {
        this.loadChildren({
          parent: this.trashId,
          channel_id: this.currentChannel.id,
        }).then(() => {
          this.loading = false;
        });
      });
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode', 'loadContentNode', 'loadChildren']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
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
      restoreItems() {
        this.previewNodeId = null;
        this.setMoveNodes(this.selected);
        // Make this empty in case items are moved outside of trash
        this.selected = [];
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
