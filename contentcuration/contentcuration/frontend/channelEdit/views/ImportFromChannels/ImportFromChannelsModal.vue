<template>

  <FullscreenModal v-model="dialog" :header="headerText">
    <template v-if="isReview" #close>
      <VBtn icon @click.stop="goBackToBrowse">
        <Icon icon="back" :color="$themeTokens.textInverted" />
      </VBtn>
    </template>
    <!-- Hack to make sure preview overlay appears inside import modal -->
    <VFadeTransition>
      <div
        v-show="previewNode"
        class="v-overlay"
        :class="{ 'v-overlay--active': showPreview }"
      ></div>
    </VFadeTransition>

    <VContainer fluid class="mb-5 modal-container mx-0 pb-5 px-4">
      <slot :preview="handlePreview"></slot>
    </VContainer>
    <ResourceDrawer
      v-if="previewNode"
      v-model="showPreview"
      temporary
      fixed
      :permanent="false"
      :nodeId="previewNode.id"
      :useRouting="false"
      @close="showPreview = false"
    >
      <template #actions>
        <VFadeTransition hide-on-leave>
          <VLayout v-show="previewIsSelected" align-center justify-end>
            <VIconWrapper small>
              check_circle
            </VIconWrapper>
            <span class="mx-1">{{ $tr('addedText') }}</span>
            <VBtn color="primary" @click="deselectNode(previewNode)">
              {{ $tr('removeButton') }}
            </VBtn>
          </VLayout>
        </VFadeTransition>
        <VBtn v-if="!previewIsSelected" color="primary" @click="selectNode(previewNode)">
          {{ $tr('addButton') }}
        </VBtn>
      </template>
    </ResourceDrawer>
    <template #bottom>
      <div class="mx-4 subheading">
        {{ $tr('resourcesSelected', { count: selectedResourcesCount }) }}
      </div>
      <VSpacer />
      <VBtn
        v-if="isReview"
        :disabled="selected.length === 0"
        color="primary"
        @click="handleClickImport"
      >
        {{ $tr('importAction') }}
      </VBtn>
      <VBtn
        v-else
        color="primary"
        :disabled="selected.length === 0"
        @click="handleClickReview"
      >
        {{ $tr('reviewAction') }}
      </VBtn>
    </template>
  </FullscreenModal>

</template>

<script>

  import { mapActions, mapMutations, mapState, mapGetters } from 'vuex';
  import sumBy from 'lodash/sumBy';
  import { RouteNames } from '../../constants';
  import ResourceDrawer from '../../components/ResourceDrawer';
  import { routerMixin } from 'shared/mixins';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import { withChangeTracker } from 'shared/data/changes';

  const IMPORT_ROUTES = [
    RouteNames.IMPORT_FROM_CHANNELS,
    RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
    RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
    RouteNames.IMPORT_FROM_CHANNELS_REVIEW,
  ];

  function getResourceCount(node) {
    if (node.kind === 'topic') {
      if (node.resource_count !== undefined) {
        return node.resource_count;
      } else {
        return node.metadata.resource_count;
      }
    }
    return 1;
  }

  export default {
    name: 'ImportFromChannelsModal',
    components: { FullscreenModal, ResourceDrawer },
    mixins: [routerMixin],
    data() {
      return {
        previewNode: null,
        showSnackbar: true,
      };
    },
    provide: {
      RouteNames,
    },
    computed: {
      ...mapState('importFromChannels', ['selected']),
      ...mapGetters('contentNode', ['getContentNode']),
      dialog: {
        get() {
          return IMPORT_ROUTES.includes(this.$route.name);
        },
        set(value) {
          if (!value) {
            this.$router.push(this.backLink);
          }
        },
      },
      showPreview: {
        get() {
          return Boolean(this.previewNode);
        },
        set(value) {
          if (!value) {
            this.previewNode = null;
          }
        },
      },
      backLink() {
        return {
          name: RouteNames.TREE_VIEW,
          params: {
            nodeId: this.$route.params.destNodeId,
          },
        };
      },
      backToBrowseRoute() {
        if (this.$route.query.last) {
          return { path: this.$route.query.last, query: this.$route.query };
        }
        return {
          name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
          query: this.$route.query,
        };
      },
      selectedResourcesCount() {
        return sumBy(this.selected, getResourceCount);
      },
      isReview() {
        return this.$route.name === RouteNames.IMPORT_FROM_CHANNELS_REVIEW;
      },
      headerText() {
        return this.isReview ? this.$tr('reviewTitle') : this.$tr('importTitle');
      },
      previewIsSelected() {
        return this.selected.some(node => node.id === this.previewNode.id);
      },
    },
    watch: {
      selectedResourcesCount(newVal, oldVal) {
        if (this.showSnackbar) {
          this.showResourcesSnackbar(newVal, oldVal);
        }
      },
    },
    beforeRouteUpdate(to, from, next) {
      this.$store.dispatch('clearSnackbar');
      next();
    },
    mounted() {
      this.updateTitleForPage();
    },
    methods: {
      ...mapActions('contentNode', ['copyContentNodes', 'waitForCopyingStatus']),
      ...mapMutations('importFromChannels', {
        selectNode: 'SELECT_NODE',
        deselectNode: 'DESELECT_NODE',
      }),
      handlePreview(previewNode) {
        this.previewNode = previewNode;
      },
      showResourcesSnackbar(newLength, oldLength) {
        const latestDelta = newLength - oldLength;
        const textFromDelta = delta => {
          const params = { count: Math.abs(delta) };
          return delta >= 0
            ? this.$tr('resourcesAddedSnackbar', params)
            : this.$tr('resourcesRemovedSnackbar', params);
        };
        this.$store.dispatch('showSnackbar', {
          text: textFromDelta(latestDelta),
        });
      },
      handleClickReview() {
        this.$router.push({
          name: RouteNames.IMPORT_FROM_CHANNELS_REVIEW,
          query: {
            ...this.$route.query,
            last: this.$route.path,
          },
        });
      },
      handleClickImport: withChangeTracker(function(changeTracker) {
        const nodeIds = this.selected.map(({ id }) => id);
        // Grab the source nodes from Vuex, since search should have loaded them into it
        const sourceNodes = nodeIds.map(id => this.getContentNode(id));
        return this.copyContentNodes({
          id__in: nodeIds,
          target: this.$route.params.destNodeId,
          sourceNodes,
        }).then(nodes => {
          // When exiting, do not show snackbar when clearing selections
          this.showSnackbar = false;
          this.$store.commit('importFromChannels/CLEAR_NODES');
          this.$router.push({
            name: RouteNames.TREE_VIEW,
            params: {
              nodeId: this.$route.params.destNodeId,
            },
          });

          return Promise.allSettled(
            nodes.map(n =>
              this.waitForCopyingStatus({
                contentNodeId: n.id,
                startingRev: changeTracker._startingRev,
              })
            )
          );
        });
      }),
      // Using a click method here instead of :to attribute because
      // it prevents the close button from getting clicked on the route change
      goBackToBrowse() {
        this.$router.push(this.backToBrowseRoute);
      },
      updateTitleForPage() {
        // NOTE: Tab title for ReviewSelectionPage is handled in that component
        if (
          [RouteNames.IMPORT_FROM_CHANNELS_BROWSE, RouteNames.IMPORT_FROM_CHANNELS_SEARCH].includes(
            this.$route.name
          )
        ) {
          this.updateTabTitle(this.$store.getters.appendChannelName(this.$tr('importTitle')));
        }
      },
    },
    $trs: {
      resourcesAddedSnackbar:
        '{count, number} {count, plural, one {resource selected} other {resources selected}}',
      resourcesRemovedSnackbar:
        '{count, number} {count, plural, one {resource removed} other {resources removed}}',
      importTitle: 'Import from other channels',
      reviewTitle: 'Resource selection',
      resourcesSelected:
        '{count, number} {count, plural, one {resource selected} other {resources selected}}',
      importAction: 'Import',
      reviewAction: 'Review',
      addButton: 'Add',
      addedText: 'Added',
      removeButton: 'Remove',
    },
  };

</script>


<style lang="scss" scoped>

  .modal-container.fluid {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }

</style>
