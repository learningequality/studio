<template>

  <FullscreenModal
    :value="true"
    :header="toolbarTitle"
  >
    <template #close>
      <span></span>
    </template>
    <template #action>
      <VBtn
        dark
        flat
        @click="onCancelClick"
      >
        {{ $tr('cancelBtnLabel') }}
      </VBtn>
    </template>
    <VContent class="px-4">
      <p class="ml-2 mt-4">
        {{ $tr('resourcesDisplayedText') }}
        <span class="font-weight-bold notranslate">&apos;{{ targetNodeTitle }}&apos;</span>
      </p>
      <NodeTreeNavigation
        v-if="selectedNodeId"
        v-model="selectedNodeId"
        :treeId="rootId"
      >
        <template #child="{ childNode }">
          <VListTile
            :key="childNode.id"
            :class="listItemClasses(childNode)"
            @click="onListItemClick(childNode)"
          >
            <VListTileAction>
              <ContentNodeIcon
                v-if="childNode.kind"
                :kind="childNode.kind"
                :size="20"
              />
            </VListTileAction>

            <VListTileContent>
              <VListTileTitle>
                <VTooltip
                  bottom
                  :disabled="!isListItemDisabled(childNode)"
                  lazy
                >
                  <template #activator="{ on }">
                    <span
                      :class="getTitleClass(childNode)"
                      v-on="on"
                    >
                      {{ getTitle(childNode) }}
                    </span>
                  </template>
                  <span>{{ listItemTooltip(childNode) }}</span>
                </VTooltip>
              </VListTileTitle>
            </VListTileContent>

            <template v-if="displayActionsButtons(childNode)">
              <VListTileAction>
                <KButton
                  :text="$tr('previewStepBtnLabel')"
                  class="font-weight-bold"
                  appearance="flat-button"
                  @click.stop.prevent="onPreviewStepClick(childNode.id)"
                />
              </VListTileAction>

              <VListTileAction v-if="!isNodePreviewOpen">
                <KButton
            
                  :text="$tr('addStepBtnLabel')"
                  :primary="true"
                  class="font-weight-bold"
                  appearance="flat-button"
                  @click.stop.prevent="onAddStepClick(childNode.id)"
                />
              </VListTileAction>
            </template>
          </VListTile>
        </template>
      </NodeTreeNavigation>
    </VContent>
    <ResourceDrawer
      :nodeId="previewNodeId"
      :channelId="currentChannelId"
      style="max-height: calc(100vh - 64px); margin-top: 64px"
      app
      @close="previewNodeId = null"
    >
      <template
        v-if="displayActionsButtons"
        #actions
      >
        <KButton
            
          :text="$tr('addStepBtnLabel')"
          class="font-weight-bold"
          :primary="true"
          appearance="flat-button"
          @click.stop.prevent="onAddStepClick(previewNodeId)"
        />
      </template>
    </ResourceDrawer>
  </FullscreenModal>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';

  import NodeTreeNavigation from './NodeTreeNavigation';
  import ResourceDrawer from './ResourceDrawer';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import { titleMixin } from 'shared/mixins';

  export default {
    name: 'AddRelatedResourcesModal',
    components: {
      ContentNodeIcon,
      NodeTreeNavigation,
      ResourceDrawer,
      FullscreenModal,
    },
    mixins: [titleMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      toolbarTitle: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedNodeId: null,
        previewNodeId: null,
      };
    },
    computed: {
      ...mapState('currentChannel', ['currentChannelId']),
      ...mapGetters('currentChannel', ['rootId']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeAncestors',
        'isPreviousStep',
        'isNextStep',
      ]),
      targetNode() {
        return this.getContentNode(this.nodeId);
      },
      targetNodeTitle() {
        return this.targetNode && this.targetNode.title ? this.targetNode.title : '';
      },
      isNodePreviewOpen() {
        return this.previewNodeId !== null;
      },
    },
    async created() {
      await this.loadAncestors({ id: this.nodeId });

      const ancestors = this.getContentNodeAncestors(this.nodeId, false);
      this.selectedNodeId = ancestors[ancestors.length - 1].id;
    },
    methods: {
      ...mapActions('contentNode', ['loadAncestors']),
      isTopic(node) {
        return node.kind === 'topic';
      },
      isTargetResource(node) {
        return node.id === this.nodeId;
      },
      isListItemDisabled(node) {
        return (
          this.isTargetResource(node) ||
          this.isPreviousStep({ rootNodeId: this.nodeId, nodeId: node.id }) ||
          this.isNextStep({ rootNodeId: this.nodeId, nodeId: node.id })
        );
      },
      displayActionsButtons(node) {
        return !this.isTopic(node) && !this.isListItemDisabled(node);
      },
      listItemClasses(node) {
        const classes = ['list-item'];

        if (this.isListItemDisabled(node)) {
          classes.push('list-item-disabled');
        }

        return classes;
      },
      listItemTooltip(node) {
        if (this.isTargetResource(node)) {
          return this.$tr('selectedAsCurrentResource');
        }
        if (this.isPreviousStep({ rootNodeId: this.nodeId, nodeId: node.id })) {
          return this.$tr('selectedAsPreviousStep');
        }
        if (this.isNextStep({ rootNodeId: this.nodeId, nodeId: node.id })) {
          return this.$tr('selectedAsNextStep');
        }

        return '';
      },
      onCancelClick() {
        this.$emit('cancel');
      },
      onListItemClick(node) {
        if (!this.isTopic(node) || this.isTargetResource(node) || this.isListItemDisabled(node)) {
          return;
        }

        this.selectedNodeId = node.id;
      },
      onAddStepClick(nodeId) {
        this.previewNodeId = null;
        this.$emit('addStep', nodeId);
      },
      onPreviewStepClick(nodeId) {
        this.previewNodeId = nodeId;
      },
    },
    $trs: {
      cancelBtnLabel: 'Cancel',
      resourcesDisplayedText: 'Only showing available resources for',
      addStepBtnLabel: 'Add',
      previewStepBtnLabel: 'Preview',
      selectedAsPreviousStep: 'Already selected as a previous step',
      selectedAsNextStep: 'Already selected as a next step',
      selectedAsCurrentResource: 'This is the current resource',
    },
  };

</script>


<style lang="scss" scoped>

  .list-item-disabled {
    opacity: 0.5;

    ::v-deep .v-list__tile--link:hover {
      color: inherit;
      background-color: transparent;
    }
  }

</style>
