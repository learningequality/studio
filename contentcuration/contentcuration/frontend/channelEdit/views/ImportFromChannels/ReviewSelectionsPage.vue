<template>

  <ImportFromChannelsModal fluid>
    <template #default="{ preview }">
      <KFixedGrid
        :numCols="2"
        :class="$computedClass(reviewSelectionsStyle)"
      >
        <!-- Selection header -->
        <KFixedGridItem
          class="selection-header"
          :span="2"
        >
          <h1>
            <KTextTruncator
              :text="$tr('reviewSelectionHeader')"
              :maxLines="1"
            />
          </h1>
        </KFixedGridItem>

        <!-- Total resources selected -->
        <KFixedGridItem :span="2">
          <KTextTruncator
            :text="resourcesDescription"
            :maxLines="2"
          />
        </KFixedGridItem>

        <!-- Selected items -->
        <KFixedGridItem
          v-if="selected.length"
          :span="2"
        >
          <template v-for="(node, index) in selected">
            <KGrid
              :key="index"
              class="selected-item"
            >
              <!-- File info -->
              <KGridItem
                :layout12="{ span: 5 }"
                :layout4="{ span: 4 }"
                class="center-contents resource"
              >
                <div class="center-contents file-info">
                  <ContentNodeIcon :kind="node.kind" />
                  <div>
                    <KButton
                      class="link"
                      :class="getTitleClass(node)"
                      :text="getTitle(node)"
                      appearance="basic-link"
                      @click="preview(node)"
                    />
                    <p v-if="node.kind === 'topic'">
                      {{ $tr('resourcesInTopic', { count: numberOfResources(node) }) }}
                    </p>
                  </div>
                </div>
              </KGridItem>

              <!-- Channel name -->
              <KGridItem
                :layout12="{ span: 5 }"
                :layout4="{ span: 4 }"
                class="center-contents channel-name"
              >
                <KTextTruncator
                  :text="node.original_channel_name"
                  :maxLines="2"
                  class="notranslate"
                />
              </KGridItem>

              <!-- Remove button -->
              <KGridItem
                :layout12="{ span: 2 }"
                :layout4="{ span: 4 }"
                alignment="right"
                class="actions center-contents"
              >
                <KButton
                  :text="$tr('removeAction')"
                  appearance="flat-button"
                  @click="handleClickRemove(node)"
                />
              </KGridItem>
            </KGrid>
            <Divider
              v-if="index !== selected.length - 1"
              :key="'div' + index"
              margin="0"
            />
          </template>
        </KFixedGridItem>
      </KFixedGrid>
    </template>
  </ImportFromChannelsModal>

</template>


<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';
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
      ...mapGetters('contentNode', ['getContentNodeAncestors']),
      ...mapState('importFromChannels', ['selected']),
      totalNumberOfResources() {
        return this.selected.reduce(
          (total, node) =>
            total + (node.kind === ContentKindsNames.TOPIC ? node.resource_count : 1),
          0,
        );
      },
      reviewSelectionsStyle() {
        return {
          width: '100%',
          padding: '24px',
          borderRadius: '4px',
          marginTop: '16px',
          boxShadow: '0 2px 4px ' + this.$themePalette.grey.v_300,
          maxWidth: '1200px',
        };
      },
      resourcesDescription() {
        return this.selected.length === 0
          ? this.$tr('noResourcesSelected')
          : this.$tr('addResourcesToFolderLabel', {
            count: this.totalNumberOfResources,
            folder: this.importDestinationTitle,
          });
      },
      importDestinationTitle() {
        const ancestors = this.getContentNodeAncestors(this.$route.params.destNodeId, true);
        const folder = ancestors.length ? ancestors[ancestors.length - 1] : null;
        return folder?.title || '';
      },
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
          this.$store.getters.appendChannelName(this.$tr('reviewSelectionHeader')),
        );
      },
    },
    $trs: {
      reviewSelectionHeader: 'Review selections',
      resourcesInTopic: '{count, number} {count, plural, one {resource} other {resources}}',
      removeAction: 'Remove',
      noResourcesSelected: 'No resources selected',
      addResourcesToFolderLabel:
        "Add {count, number} {count, plural, one {resource} other {resources}} to '{folder}'",
    },
  };

</script>


<style lang="scss" scoped>

  $spacing-standard: 12px;
  $spacing-large: 24px;

  .selection-header {
    margin-bottom: $spacing-large;
  }

  .selected-item {
    padding: $spacing-standard 0;
  }

  .center-contents {
    display: flex;
    align-items: center;
  }

  .resource {
    justify-content: flex-start;
  }

  .channel-name {
    padding: $spacing-standard 0;
  }

  .actions {
    justify-content: flex-end;
  }

  .file-info {
    flex-direction: row;
    gap: $spacing-standard;

    p {
      margin: 0;
    }

    .link {
      margin-bottom: 2px;
    }
  }

  // Because the tiles don't re-adjust in responsive mode
  ::v-deep .v-list__tile {
    height: auto;
  }

</style>
