<template>

  <FullscreenModal
    v-model="dialog"
    :header="$tr('trashModalTitle')"
  >
    <LoadingText
      v-if="loading"
      data-test="loading"
    />
    <VContainer
      v-else-if="!items.length"
      fluid
      data-test="empty"
    >
      <h1 class="font-weight-bold headline mt-4 pt-4 text-xs-center">
        {{ $tr('trashEmptyText') }}
      </h1>
      <p class="mt-3 subheading text-xs-center">
        {{ $tr('trashEmptySubtext') }}
      </p>
    </VContainer>
    <VContent v-else>
      <VContainer
        fluid
        class="pa-4"
        data-test="list"
        style="max-height: calc(100vh - 128px); overflow-y: auto"
      >
        <VCard
          style="width: 100%; max-width: 900px; margin: 0 auto"
          flat
          class="pa-2"
        >
          <VDataTable
            :headers="headers"
            :items="items"
            hide-actions
            must-sort
          >
            <template #headerCell="props">
              <VLayout
                v-if="props.header.selectAll"
                row
                align-center
              >
                <VFlex shrink>
                  <Checkbox
                    :inputValue="selected.length === items.length"
                    :indeterminate="!!selected.length && selected.length !== items.length"
                    data-test="selectall"
                    @input="toggleSelectAll"
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
            <template #items="{ item }">
              <tr
                :key="item.id"
                :style="{ backgroundColor: getItemBackground(item.id) }"
              >
                <td>
                  <VLayout
                    row
                    align-center
                  >
                    <VFlex shrink>
                      <Checkbox
                        v-model="selected"
                        :value="item.id"
                        data-test="checkbox"
                      />
                    </VFlex>
                    <VFlex
                      shrink
                      class="mx-3"
                    >
                      <ContentNodeIcon :kind="item.kind" />
                    </VFlex>
                    <VFlex
                      :class="getTitleClass(item)"
                      grow
                    >
                      <ActionLink
                        :text="getTitle(item)"
                        data-test="item"
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
          <div class="show-more-button-container">
            <KButton
              v-if="more"
              :disabled="moreLoading"
              @click="loadMore"
            >
              {{ showMoreLabel }}
            </KButton>
          </div>
        </VCard>
      </VContainer>
      <ResourceDrawer
        style="margin-top: 64px"
        :nodeId="previewNodeId"
        :channelId="currentChannel.id"
        app
        @close="previewNodeId = null"
      />
    </VContent>
    <template #bottom>
      <span
        v-if="selected.length"
        class="mr-4 subheading"
      >
        {{ getSelectedTopicAndResourceCountText(selected) }}
      </span>
      <VSpacer />
      <KButtonGroup>
        <KButton
          appearance="flat-button"
          :text="$tr('restoreButton')"
          :disabled="!selected.length"
          data-test="restore"
          @click="moveModalOpen = true"
        />
        <KButton
          :primary="true"
          :text="$tr('deleteButton')"
          :disabled="!selected.length"
          data-test="delete"
          @click="showConfirmationDialog = true"
        />
      </KButtonGroup>
    </template>
    <KModal
      v-if="showConfirmationDialog"
      data-test="deleteconfirm"
      :title="$tr('deleteConfirmationHeader', counts)"
      :cancelText="$tr('deleteConfirmationCancelButton')"
      :submitText="$tr('deleteConfirmationDeleteButton')"
      @cancel="showConfirmationDialog = false"
      @submit="deleteNodes"
    >
      <p>{{ $tr('deleteConfirmationText') }}</p>
    </KModal>
    <MoveModal
      v-if="moveModalOpen"
      ref="moveModal"
      v-model="moveModalOpen"
      :moveNodeIds="selected"
      :movingFromTrash="true"
      @target="moveNodes"
    />
  </FullscreenModal>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import NodePanel from '../NodePanel';
  import MoveModal from '../../components/move/MoveModal';
  import ResourceDrawer from '../../components/ResourceDrawer';
  import { RouteNames } from '../../constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import Checkbox from 'shared/views/form/Checkbox';
  import LoadingText from 'shared/views/LoadingText';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import { titleMixin, routerMixin } from 'shared/mixins';
  import { crossComponentTranslator } from 'shared/i18n';

  const showMoreTranslator = crossComponentTranslator(NodePanel);

  export default {
    name: 'TrashModal',
    components: {
      ContentNodeIcon,
      ResourceDrawer,
      Checkbox,
      LoadingText,
      FullscreenModal,
      MoveModal,
    },
    mixins: [titleMixin, routerMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        dialog: true,
        loading: false,
        more: null,
        moreLoading: false,
        previewNodeId: null,
        selected: [],
        showConfirmationDialog: false,
        moveModalOpen: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'trashId', 'rootId']),
      ...mapGetters('contentNode', [
        'getContentNodeChildren',
        'getTopicAndResourceCounts',
        'getSelectedTopicAndResourceCountText',
      ]),
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
          name: RouteNames.TREE_VIEW,
          params: this.$route.params,
        };
      },
      counts() {
        return this.getTopicAndResourceCounts(this.selected);
      },
      showMoreLabel() {
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return showMoreTranslator.$tr('showMore');
      },
    },
    watch: {
      dialog(newValue) {
        if (!newValue) {
          this.$router.push(this.backLink);
        }
      },
    },
    created() {
      this.loadContentNodes({ parent__in: [this.rootId] });
      this.loadAncestors({ id: this.nodeId });
      this.loadNodes();
    },
    mounted() {
      this.updateTabTitle(this.$store.getters.appendChannelName(this.$tr('trashModalTitle')));
    },
    methods: {
      ...mapActions('contentNode', [
        'deleteContentNodes',
        'loadChildren',
        'moveContentNodes',
        'loadContentNodes',
        'loadAncestors',
      ]),
      loadNodes() {
        this.loading = true;
        if (!this.trashId) {
          this.loading = false;
          return;
        }
        this.loadChildren({ parent: this.trashId, ordering: '-modified' }).then(
          childrenResponse => {
            this.loading = false;
            this.more = childrenResponse.more || null;
          },
        );
      },
      moveNodes(target) {
        return this.moveContentNodes({
          id__in: this.selected,
          parent: target,
          inherit: false,
        }).then(() => {
          this.reset();
          this.$refs.moveModal && this.$refs.moveModal.moveComplete();
          // Reload after this to ensure that anything over the pagination fold is loaded now
          this.loadNodes();
        });
      },
      reset() {
        this.previewNodeId = null;
        this.toggleSelectAll(false);
      },
      deleteNodes() {
        const text = this.$tr('deleteSuccessMessage');
        this.deleteContentNodes(this.selected).then(() => {
          this.showConfirmationDialog = false;
          this.reset();
          this.$store.dispatch('showSnackbar', { text });
          // Reload after this to ensure that anything over the pagination fold is loaded now
          this.loadNodes();
        });
      },
      toggleSelectAll(selectAll) {
        this.selected = selectAll ? this.items.map(i => i.id) : [];
      },
      getItemBackground(id) {
        return this.previewNodeId === id ? this.$vuetify.theme.greyBackground : 'transparent';
      },
      loadMore() {
        if (this.more && !this.moreLoading) {
          this.moreLoading = true;
          this.loadContentNodes(this.more).then(response => {
            this.more = response.more || null;
            this.moreLoading = false;
          });
        }
      },
    },
    $trs: {
      trashModalTitle: 'Trash',
      trashEmptyText: 'Trash is empty',
      trashEmptySubtext: 'Resources removed from this channel will appear here',
      selectAllHeader: 'Select all',
      deletedHeader: 'Removed',
      deleteButton: 'Delete',
      restoreButton: 'Restore',
      deleteConfirmationHeader:
        'Permanently delete {topicCount, plural,\n =1 {# folder}\n other {# folders}}, {resourceCount, plural,\n =1 {# resource}\n other {# resources}}?',
      deleteConfirmationText: 'You cannot undo this action. Are you sure you want to continue?',
      deleteConfirmationDeleteButton: 'Delete permanently',
      deleteConfirmationCancelButton: 'Cancel',
      deleteSuccessMessage: 'Permanently deleted',
    },
  };

</script>


<style lang="scss" scoped>

  .show-more-button-container {
    display: flex;
    justify-content: center;
    width: 100%;
  }

</style>
