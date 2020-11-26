<template>

  <div>
    <div class="mb-4 mt-4 px-4 title">
      <ContentNodeIcon
        v-if="node && node.kind"
        :kind="node.kind"
        class="mr-1"
      />
      <h2
        v-if="node && node.title"
        class="headline mx-2 notranslate"
        data-test="title"
      >
        {{ node.title }}
      </h2>
    </div>

    <p class="mb-0 px-4">
      {{ $tr('previewHelpText') }}
    </p>
    <p class="mb-0 px-4">
      <ActionLink
        :text="$tr('showPreviewBtnLabel')"
        @click="showResourcePreview = true"
      />
    </p>

    <VDialog
      v-model="showResourcePreview"
      width="490"
    >
      <VCard>
        <VCardTitle>
          <h3 class="font-weight-bold title">
            {{ $tr('resourcePreviewDialogTitle') }}
          </h3>
        </VCardTitle>

        <VCardText>
          <img src="./related-resources-preview.png" class="resource-preview">

          <VLayout mt-3>
            <VFlex>
              <Icon color="primary" class="mx-1">
                $vuetify.icons.light_bulb
              </Icon>
            </VFlex>
            <VFlex class="mx-2">
              <p>{{ $tr('resourcePreviewDialogHelpText') }}</p>
            </VFlex>
          </VLayout>

          <VLayout justify-end>
            <VFlex shrink>
              <VBtn
                color="greyBackground"
                class="font-weight-bold"
                @click="showResourcePreview = false"
              >
                {{ $tr('dialogCloseBtnLabel') }}
              </VBtn>
            </VFlex>
          </VLayout>
        </VCardText>
      </VCard>
    </VDialog>

    <VLayout justify-start wrap>
      <VFlex
        xs12
        md5
        data-test="previousSteps"
        class="px-4"
      >
        <h3 class="font-weight-bold mt-5 title">
          {{ $tr('previousStepsTitle') }}
        </h3>
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

        <VBtn
          flat
          color="primary"
          class="font-weight-bold ml-0"
          @click="onAddPreviousStepClick"
        >
          {{ $tr('addPreviousStepBtnLabel') }}
        </VBtn>
      </VFlex>

      <VFlex
        xs12
        md5
        offset-md1
        data-test="nextSteps"
        class="px-4"
      >
        <h3 class="font-weight-bold mt-5 title">
          {{ $tr('nextStepsTitle') }}
        </h3>
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

        <VBtn
          flat
          color="primary"
          class="font-weight-bold ml-0"
          @click="onAddNextStepClick"
        >
          {{ $tr('addNextStepBtnLabel') }}
        </VBtn>
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';

  import { RouterNames } from '../../constants';

  import RelatedResourcesList from '../RelatedResourcesList/RelatedResourcesList';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'RelatedResourcesTab',
    components: {
      ContentNodeIcon,
      RelatedResourcesList,
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
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            detailNodeIds: nodeId,
          },
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
          name: RouterNames.ADD_PREVIOUS_STEPS,
          params: {
            ...this.$route.params,
            targetNodeId: this.nodeId,
          },
          query: {
            last: this.$route.name,
          },
        });
      },
      onAddNextStepClick() {
        this.$router.push({
          name: RouterNames.ADD_NEXT_STEPS,
          params: {
            ...this.$route.params,
            targetNodeId: this.nodeId,
          },
          query: {
            last: this.$route.name,
          },
        });
      },
    },
    $trs: {
      previewHelpText:
        'Related resources are displayed as recommendations when learners engage with this resource',
      showPreviewBtnLabel: 'Show me',
      resourcePreviewDialogTitle: 'Related resources',
      resourcePreviewDialogHelpText:
        'Related resources in Kolibri display as recommendations alongside the resource that a learner is currently engaging with',
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

<style lang="less" scoped>

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

</style>
