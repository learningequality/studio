<template>

  <FullscreenModal :value="true" :header="toolbarTitle">
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
      <p class="mt-4 ml-2">
        {{ $tr('resourcesDisplayedText') }}
        <span class="font-weight-bold notranslate">&apos;{{ targetNodeTitle }}&apos;</span>
      </p>
      <NodeTreeNavigation
        v-if="selectedNodeId"
        v-model="selectedNodeId"
        :treeId="rootId"
      >
        <VListTile
          slot="child"
          :key="childNode.id"
          slot-scope="{ childNode }"
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
                right
                :disabled="!isListItemDisabled(childNode)"
              >
                <template v-slot:activator="{ on }">
                  <span
                    class="notranslate"
                    v-on="on"
                  >
                    {{ childNode.title }}
                  </span>
                </template>
                <span>{{ listItemTooltip(childNode) }}</span>
              </VTooltip>
            </VListTileTitle>
          </VListTileContent>

          <template v-if="displayActionsButtons(childNode)">
            <VListTileAction>
              <VBtn
                flat
                class="font-weight-bold"
                @click.stop.prevent="onPreviewStepClick(childNode.id)"
              >
                {{ $tr('previewStepBtnLabel') }}
              </VBtn>
            </VListTileAction>

            <VListTileAction v-if="!isNodePreviewOpen">
              <VBtn
                flat
                color="primary"
                class="font-weight-bold"
                @click.stop.prevent="onAddStepClick(childNode.id)"
              >
                {{ $tr('addStepBtnLabel') }}
              </VBtn>
            </VListTileAction>
          </template>
        </VListTile>
      </NodeTreeNavigation>
    </VContent>
    <ResourceDrawer
      :nodeId="previewNodeId"
      :channelId="currentChannelId"
      style="margin-top: 64px; max-height: calc(100vh-64px);"
      app
      @close="previewNodeId = null"
    >
      <template v-if="displayActionsButtons" #actions>
        <VBtn
          flat
          color="primary"
          class="font-weight-bold"
          @click.stop.prevent="onAddStepClick(previewNodeId)"
        >
          {{ $tr('addStepBtnLabel') }}
        </VBtn>
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

  export default {
    name: 'AddRelatedResourcesModal',
    components: {
      ContentNodeIcon,
      NodeTreeNavigation,
      ResourceDrawer,
      FullscreenModal,
    },
    props: {
      targetNodeId: {
        type: String,
        required: true,
      },
      toolbarTitle: {
        type: String,
        required: true,
      },
      selectedAsPreviousStepTooltip: {
        type: String,
        required: true,
      },
      selectedAsNextStepTooltip: {
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
      ...mapState('currentChannel', ['rootId']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeAncestors',
        'isPreviousStep',
        'isNextStep',
      ]),
      targetNode() {
        return this.getContentNode(this.targetNodeId);
      },
      targetNodeTitle() {
        return this.targetNode && this.targetNode.title ? this.targetNode.title : '';
      },
      isNodePreviewOpen() {
        return this.previewNodeId !== null;
      },
    },
    async created() {
      await this.loadAncestors({ id: this.targetNodeId });

      const ancestors = this.getContentNodeAncestors(this.targetNodeId, false);
      this.selectedNodeId = ancestors[ancestors.length - 1].id;
    },
    methods: {
      ...mapActions('contentNode', ['loadAncestors']),
      isTopic(node) {
        return node.kind === 'topic';
      },
      isTargetResource(node) {
        return node.id === this.targetNodeId;
      },
      isListItemDisabled(node) {
        return (
          this.isTargetResource(node) ||
          this.isPreviousStep({ rootNodeId: this.targetNodeId, nodeId: node.id }) ||
          this.isNextStep({ rootNodeId: this.targetNodeId, nodeId: node.id })
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
        if (this.isPreviousStep({ rootNodeId: this.targetNodeId, nodeId: node.id })) {
          return this.selectedAsPreviousStepTooltip;
        }
        if (this.isNextStep({ rootNodeId: this.targetNodeId, nodeId: node.id })) {
          return this.selectedAsNextStepTooltip;
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
      selectedAsCurrentResource: 'This is the current resource',
    },
  };

</script>

<style lang="less" scoped>

  .list-item-disabled {
    opacity: 0.5;
    /deep/ .v-list__tile--link:hover {
      color: inherit;
      background-color: transparent;
    }
  }

</style>
