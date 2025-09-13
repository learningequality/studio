<template>
  <div>
    <!-- Header with icon and title -->
    <div class="mb-4 mt-4 px-4 title">
      <ContentNodeIcon v-if="node && node.kind" :kind="node.kind" class="mr-1" />
      <h2 v-if="node && node.title" class="headline mx-2 notranslate" data-test="title">
        {{ node.title }}
      </h2>
    </div>

    <!-- Preview help text and button -->
    <p class="mb-0 px-4">{{ $tr('previewHelpText') }}</p>
    <p class="mb-0 px-4">
      <KButton appearance="basic-link" @click="showResourcePreview = true">
        {{ $tr('showPreviewBtnLabel') }}
      </KButton>
    </p>

    <!-- Resource preview modal -->
    <KModal
      v-if="showResourcePreview"
      :title="$tr('resourcePreviewDialogTitle')"
      :cancelText="$tr('dialogCloseBtnLabel')"
      @cancel="showResourcePreview = false"
    >
      <img src="./relatedresources.png" class="resource-preview" />
      <div class="mt-3">
        <div class="mx-2">
          <p>{{ $tr('resourcePreviewDialogHelpText') }}</p>
        </div>
      </div>
    </KModal>

    <!-- Previous / Next Steps sections -->
    <div class="steps-container">
      <!-- Previous Steps -->
      <div class="step-section" data-test="previousSteps">
        <h3 class="font-weight-bold mt-5 title">{{ $tr('previousStepsTitle') }}</h3>
        <p>{{ $tr('previousStepsExplanation') }}</p>

        <RelatedResourcesList
          v-if="previousSteps"
          :items="previousSteps"
          :removeResourceBtnLabel="$tr('removePreviousStepBtnLabel')"
          class="mt-3"
          @itemClick="onStepClick"
          @removeItemClick="onRemovePreviousStepClick"
        />

        <p v-if="previousSteps && previousSteps.length > 4">
          {{ $tr('tooManyPreviousStepsWarning') }}
        </p>

        <KButton appearance="flat" class="font-weight-bold ml-0" @click="onAddPreviousStepClick">
          {{ $tr('addPreviousStepBtnLabel') }}
        </KButton>
      </div>

      <!-- Next Steps -->
      <div class="step-section" data-test="nextSteps">
        <h3 class="font-weight-bold mt-5 title">{{ $tr('nextStepsTitle') }}</h3>
        <p>{{ $tr('nextStepsExplanation') }}</p>

        <RelatedResourcesList
          v-if="nextSteps"
          :items="nextSteps"
          :removeResourceBtnLabel="$tr('removeNextStepBtnLabel')"
          class="mt-3"
          @itemClick="onStepClick"
          @removeItemClick="onRemoveNextStepClick"
        />

        <p v-if="nextSteps && nextSteps.length > 4">
          {{ $tr('tooManyNextStepsWarning') }}
        </p>

        <KButton appearance="flat" class="font-weight-bold ml-0" @click="onAddNextStepClick">
          {{ $tr('addNextStepBtnLabel') }}
        </KButton>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { RouteNames } from '../../constants';
import RelatedResourcesList from '../RelatedResourcesList/RelatedResourcesList';
import ContentNodeIcon from 'shared/views/ContentNodeIcon';
import KButton from 'kolibri-design-system/lib/buttons-and-links/KButton.vue';
import KModal from 'kolibri-design-system/lib/KModal';

export default {
  name: 'RelatedResourcesTab',
  components: {
    ContentNodeIcon,
    RelatedResourcesList,
    KButton,
    KModal,
  },
  props: {
    nodeId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      showResourcePreview: false,
    };
  },
  computed: {
    ...mapGetters('contentNode', [
      'getContentNode',
      'getImmediatePreviousStepsList',
      'getImmediateNextStepsList',
    ]),
    node() {
      return this.getContentNode(this.nodeId);
    },
    previousSteps() {
      return this.getImmediatePreviousStepsList(this.nodeId);
    },
    nextSteps() {
      return this.getImmediateNextStepsList(this.nodeId);
    },
  },
  methods: {
    ...mapActions('contentNode', ['removePreviousStepFromNode', 'removeNextStepFromNode']),
    onStepClick(nodeId) {
      const route = this.$router.resolve({
        name: RouteNames.CONTENTNODE_DETAILS,
        params: { detailNodeIds: nodeId },
      });
      window.open(route.href, '_blank');
    },
    onRemovePreviousStepClick(previousStepId) {
      this.removePreviousStepFromNode({ targetId: this.nodeId, previousStepId }).then(() => {
        this.$store.dispatch('showSnackbarSimple', this.$tr('removedPreviousStepSnackbar'));
      });
    },
    onRemoveNextStepClick(nextStepId) {
      this.removeNextStepFromNode({ targetId: this.nodeId, nextStepId }).then(() => {
        this.$store.dispatch('showSnackbarSimple', this.$tr('removedNextStepSnackbar'));
      });
    },
    onAddPreviousStepClick() {
      this.$router.push({
        name: RouteNames.ADD_PREVIOUS_STEPS,
        params: { ...this.$route.params, targetNodeId: this.nodeId },
        query: { last: this.$route.name },
      });
    },
    onAddNextStepClick() {
      this.$router.push({
        name: RouteNames.ADD_NEXT_STEPS,
        params: { ...this.$route.params, targetNodeId: this.nodeId },
        query: { last: this.$route.name },
      });
    },
  },
  $trs: {
    previewHelpText: 'Related resources are displayed as recommendations when learners engage with this resource',
    showPreviewBtnLabel: 'Show me',
    resourcePreviewDialogTitle: 'Related resources',
    resourcePreviewDialogHelpText:
      'Related resources are labeled as helpful additions for learners engaging with the current resource.',
    dialogCloseBtnLabel: 'Close',
    previousStepsTitle: 'Previous steps',
    previousStepsExplanation:
      'Recommended resources that introduce skills or concepts needed in order to use this resource',
    addPreviousStepBtnLabel: 'Add previous step',
    nextStepsTitle: 'Next steps',
    nextStepsExplanation:
      'Recommended resources that build on skills or concepts learned in this resource',
    addNextStepBtnLabel: 'Add next step',
    removePreviousStepBtnLabel: 'Remove previous step',
    removeNextStepBtnLabel: 'Remove next step',
    tooManyPreviousStepsWarning:
      'Limit the number of previous steps to create a more guided learning experience',
    tooManyNextStepsWarning:
      'Limit the number of next steps to create a more guided learning experience',
    removedNextStepSnackbar: 'Removed next step',
    removedPreviousStepSnackbar: 'Removed previous step',
  },
};
</script>

<style lang="scss" scoped>
.title {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
}

.resource-preview {
  display: block;
  width: 100%;
  margin: auto;
}

/* Layout for previous/next steps without Vuetify */
.steps-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.step-section {
  flex: 1 1 45%;
  margin: 0 1rem 2rem 0;
}
</style>
