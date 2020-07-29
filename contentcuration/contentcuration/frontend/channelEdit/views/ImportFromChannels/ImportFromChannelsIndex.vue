<template>

  <FullscreenModal v-model="dialog" :header="headerText">
    <template v-if="isReview" #close>
      <VBtn icon @click.stop="goBackToBrowse">
        <Icon>
          arrow_back
        </Icon>
      </VBtn>
    </template>
    <VContainer fluid class="mb-5 px-5 pb-5">
      <RouterView
        :selected.sync="selected"
        @preview="handlePreview"
      />
    </VContainer>
    <ResourceDrawer
      v-if="previewNode"
      v-model="showPreview"
      temporary
      fixed
      :permanent="false"
      :nodeId="previewNode.id"
      @close="showPreview = false"
    >
      <template #actions>
        <VFadeTransition hide-on-leave>
          <VLayout v-show="previewIsSelected" align-center>
            <Icon small>
              check_circle
            </Icon>
            <span class="mx-1">{{ $tr('addedText') }}</span>
            <VBtn color="primary" @click="removePreviewNode">
              {{ $tr('removeButton') }}
            </VBtn>
          </VLayout>
        </VFadeTransition>
        <VBtn v-if="!previewIsSelected" color="primary" @click="addPreviewNode">
          {{ $tr('addButton') }}
        </VBtn>
      </template>
    </ResourceDrawer>
    <GlobalSnackbar/>
    <template #bottom>
      <VSpacer />
      <div class="subheading mx-4">
        {{ $tr('resourcesSelected', {count: selectedResourcesCount}) }}
      </div>
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

  import { mapActions } from 'vuex';
  import sumBy from 'lodash/sumBy';
  import { RouterNames } from '../../constants';
  import ResourceDrawer from '../../components/ResourceDrawer';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  const IMPORT_ROUTES = [
    RouterNames.IMPORT_FROM_CHANNELS,
    RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
    RouterNames.IMPORT_FROM_CHANNELS_SEARCH,
    RouterNames.IMPORT_FROM_CHANNELS_REVIEW,
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
    name: 'ImportFromChannelsIndex',
    components: { FullscreenModal, ResourceDrawer, GlobalSnackbar },
    data() {
      return {
        selected: [],
        previewNode: null,
      };
    },
    provide: {
      RouterNames,
    },
    computed: {
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
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.$route.params.destNodeId,
          },
        };
      },
      backToBrowseRoute() {
        if (this.$route.query.last) {
          return { path: this.$route.query.last };
        }
        return {
          name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
        };
      },
      selectedResourcesCount() {
        return sumBy(this.selected, getResourceCount);
      },
      isReview() {
        return this.$route.name === RouterNames.IMPORT_FROM_CHANNELS_REVIEW;
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
        this.showResourcesSnackbar(newVal, oldVal);
      },
    },
    beforeRouteUpdate(to, from, next) {
      this.$store.dispatch('clearSnackbar');
      next();
    },
    methods: {
      ...mapActions('importFromChannels', ['duplicateNodesToTarget']),
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
          name: RouterNames.IMPORT_FROM_CHANNELS_REVIEW,
          query: {
            last: this.$route.path,
          },
        });
      },
      handleClickImport() {
        // TODO: Use channelEdit/vuex/contentNode/copyContentNodes once it works
        const nodeIds = this.selected.map(({ id }) => id);
        return this.duplicateNodesToTarget({
          nodeIds,
          targetNodeId: this.$route.params.destNodeId,
        }).then(() => {
          this.$router.push({
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: this.$route.params.destNodeId,
            },
          });
        });
      },
      // Using a click method here instead of :to attribute because
      // it prevents the close button from getting clicked on the route change
      goBackToBrowse() {
        this.$router.push(this.backToBrowseRoute);
      },
      addPreviewNode() {
        this.selected.push({ ...this.previewNode });
      },
      removePreviewNode() {
        this.selected = this.selected.filter(node => node.id !== this.previewNode.id);
      },
    },
    $trs: {
      resourcesAddedSnackbar:
        'Selected {count, number} {count, plural, one {resource} other {resources}}',
      resourcesRemovedSnackbar:
        'Removed {count, number} {count, plural, one {resource} other {resources}}',
      importTitle: 'Import from other channels',
      reviewTitle: 'Resource selection',
      resourcesSelected: `{count, number} {count, plural, one {resource selected} other {resources selected}}`,
      importAction: 'Import',
      reviewAction: 'Review',
      addButton: 'Add',
      addedText: 'Added',
      removeButton: 'Remove',
    },
  };

</script>


<style lang="less" scoped>


</style>
