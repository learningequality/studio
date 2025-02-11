<template>

  <ImportFromChannelsModal fluid>
    <template #default="{ preview }">
      <h1>{{ $tr('reviewSelectionHeader') }}</h1>
      <p v-if="selected.length === 0">
        {{ $tr('noResourcesSelected') }}
      </p>
      <VList>
        <template v-for="(node, index) in selected">
          <VListTile :key="index" class="height-auto py-2">
            <VLayout row align-center wrap>
              <VFlex shrink class="mr-2 px-2">
                <ContentNodeIcon :kind="node.kind" />
              </VFlex>
              <VFlex md5 sm12>
                <VListTileContent>
                  <VListTileTitle>
                    <ActionLink
                      class="subheading"
                      :class="getTitleClass(node)"
                      :text="getTitle(node)"
                      @click="preview(node)"
                    />
                  </VListTileTitle>
                  <VListTileSubTitle v-if="node.kind === 'topic'">
                    {{ $tr('resourcesInTopic', { count: numberOfResources(node) }) }}
                  </VListTileSubTitle>
                </VListTileContent>
              </VFlex>
              <VFlex md4 sm12 class="notranslate">
                {{ node.original_channel_name }}
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
    </template>
  </ImportFromChannelsModal>

</template>


<script>

  import { mapMutations, mapState } from 'vuex';
  import ImportFromChannelsModal from './ImportFromChannelsModal';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { titleMixin, routerMixin } from 'shared/mixins';

  export default {
    name: 'ReviewSelectionsPage',
    components: {
      ContentNodeIcon,
      ImportFromChannelsModal,
    },
    mixins: [titleMixin, routerMixin],
    computed: {
      ...mapState('importFromChannels', ['selected']),
    },
    mounted() {
      this.updateTitleForPage();
    },
    methods: {
      ...mapMutations('importFromChannels', { deselectNode: 'DESELECT_NODE' }),
      handleClickRemove(node) {
        this.deselectNode(node);
      },
      numberOfResources(node) {
        if (node.kind !== ContentKindsNames.TOPIC) {
          return undefined;
        }
        return node.resource_count;
      },
      updateTitleForPage() {
        this.updateTabTitle(
          this.$store.getters.appendChannelName(this.$tr('reviewSelectionHeader'))
        );
      },
    },
    $trs: {
      reviewSelectionHeader: 'Review selections',
      resourcesInTopic: '{count, number} {count, plural, one {resource} other {resources}}',
      removeAction: 'Remove',
      noResourcesSelected: 'No resources selected',
    },
  };

</script>


<style lang="scss" scoped>

  .over-app-bar {
    z-index: 3;
  }

  // Because the tiles don't re-adjust in responsive mode
  ::v-deep .v-list__tile {
    height: auto;
  }

</style>
