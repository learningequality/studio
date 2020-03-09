<template>

  <div>
    <VToolbar fixed dark color="primary" class="over-app-bar">
      <VBtn icon :to="exitRoute">
        <VIcon>arrow_back</VIcon>
      </VBtn>
      <VToolbarTitle>
        {{ $tr('toolbarTitle') }}
      </VToolbarTitle>
    </VToolbar>

    <VSheet
      class="pa-5 ma-5"
      elevation="2"
    >
      <h1>{{ $tr('reviewSelectionHeader') }}</h1>
      <p v-if="selected.length === 0">
        {{ $tr('noResourcesSelected') }}
      </p>
      <VList>
        <template v-for="(node, index) in selected">
          <VListTile :key="index" class="py-2 height-auto">
            <VLayout row align-center wrap>
              <VFlex shrink class="px-2 mr-2">
                <ContentNodeIcon :kind="node.kind" />
              </VFlex>
              <VFlex md5 sm12>
                <VListTileContent>
                  <VListTileTitle>
                    <RouterLink :to="node.backRoute">
                      {{ node.title }}
                    </RouterLink>
                  </VListTileTitle>
                  <VListTileSubTitle v-if="numberOfResources(node) !== undefined">
                    {{ $tr('resourcesInTopic', { count: numberOfResources(node) }) }}
                  </VListTileSubTitle>
                </VListTileContent>
              </VFlex>
              <VFlex md4 sm12>
                {{ node.channelName }}
              </VFlex>
              <VFlex grow class="text-sm-right">
                <VBtn flat @click="handleClickRemove(node)">
                  {{ $tr('removeAction') }}
                </VBtn>
              </VFlex>
            </VLayout>
          </VListTile>
          <VDivider :key="'div' + index" />
        </template>
      </VList>
    </VSheet>

    <BottomToolBar>
      <VLayout align-center justify-end>
        <span class="mr-2">
          {{ $tr('resourcesSelected', { count: selectedResourcesCount }) }}
        </span>
        <VBtn
          :disabled="selected.length === 0"
          color="primary"
          @click="handleClickImport"
        >
          {{ $tr('importAction') }}
        </VBtn>
      </VLayout>
    </BottomToolBar>
  </div>

</template>


<script>

  import BottomToolBar from 'shared/views/BottomToolBar';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'ReviewSelectionsPage',
    inject: ['RouterNames'],
    components: {
      BottomToolBar,
      ContentNodeIcon,
    },
    props: {
      selected: {
        type: Array,
        required: true,
        default() {
          return [];
        },
      },
      selectedResourcesCount: {
        type: Number,
        default: 0,
      },
    },
    computed: {
      exitRoute() {
        // TODO save last location
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
        };
      },
    },
    methods: {
      handleClickRemove(node) {
        const newSelected = this.selected.filter(x => x.id !== node.id);
        this.$emit('update:selected', newSelected);
      },
      handleClickImport() {
        const nodeIds = this.selected.map(({ id }) => id);
        return this.$store
          .dispatch('importFromChannels/duplicateNodesToTarget', {
            nodeIds,
            targetNodeId: this.$route.params.destNodeId,
          })
          .then(duplicationTask => {
            this.$router.push({
              name: this.RouterNames.TREE_VIEW,
              params: {
                nodeId: this.$route.params.destNodeId,
              },
              query: {
                watchTask: duplicationTask.id,
              },
            });
          });
      },
      numberOfResources(node) {
        if (node.kind !== 'topic') {
          return undefined;
        }
        return node.resource_count;
      },
    },
    $trs: {
      reviewSelectionHeader: 'Review selections',
      resourcesSelected: `{count, number} {count, plural, one {selection} other {selections}}`,
      resourcesInTopic: `{count, number} {count, plural, one {resource} other {resources}}`,
      importAction: 'Import',
      removeAction: 'Remove',
      toolbarTitle: 'Resource selection',
      noResourcesSelected: 'No resources selected',
    },
  };

</script>


<style lang="less" scoped>

  .over-app-bar {
    z-index: 3;
  }

  // Because the tiles don't re-adjust in responsive mode
  /deep/ .v-list__tile {
    height: auto;
  }

</style>
