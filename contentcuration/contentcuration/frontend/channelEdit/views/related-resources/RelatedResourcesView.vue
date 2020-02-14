<template>

  <div>
    <div class="title mt-4 mb-4">
      <ContentNodeIcon
        v-if="node.kind"
        :kind="node.kind"
        class="mr-1"
      />
      <h2
        v-if="node.title"
        class="headline"
        data-test="title"
      >
        {{ node.title }}
      </h2>
    </div>

    <p class="mb-0">
      {{ $tr('previewHelpText') }}
    </p>

    <VDialog
      v-model="showResourcePreview"
      width="490"
    >
      <template v-slot:activator="{ on }">
        <button
          class="primary--text"
          :style="{'text-decoration': 'underline'}"
          v-on="on"
        >
          {{ $tr('showPreviewBtnLabel') }}
        </button>
      </template>

      <VCard>
        <VCardTitle>
          <h3 class="title font-weight-bold">
            {{ $tr('resourcePreviewDialogTitle') }}
          </h3>
        </VCardTitle>

        <VCardText>
          <img src="./related-resources-preview.png" class="resource-preview">

          <VLayout mt-3>
            <VFlex>
              <IconLightBulb />
            </VFlex>
            <VFlex class="ml-1">
              <p>{{ $tr('resourcePreviewDialogHelpText') }}</p>
            </VFlex>
          </VLayout>

          <VLayout justify-end>
            <VFlex shrink>
              <VBtn
                flat
                class="font-weight-bold"
                @click="showResourcePreview=false"
              >
                {{ $tr('dialogCloseBtnLabel') }}
              </VBtn>
            </VFlex>
          </VLayout>
        </VCardText>
      </VCard>
    </VDialog>

    <VLayout justify-start mt-3 wrap>
      <VFlex xs12 md5>
        <h3 class="title font-weight-bold">
          {{ $tr('previousStepsTitle') }}
        </h3>
        <p>{{ $tr('previousStepsExplanation') }}</p>
        <div
          class="mt-3 text-uppercase primary--text font-weight-bold"
          :style="{ 'cursor': 'pointer' }"
        >
          {{ $tr('addPreviousStepBtnLabel') }}
        </div>
      </VFlex>

      <VFlex xs12 md5 offset-md1>
        <h3 class="title font-weight-bold">
          {{ $tr('nextStepsTitle') }}
        </h3>
        <p>{{ $tr('nextStepsExplanation') }}</p>
        <div
          class="mt-3 text-uppercase primary--text font-weight-bold"
          :style="{ 'cursor': 'pointer' }"
        >
          {{ $tr('addNextStepBtnLabel') }}
        </div>
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';

  import ContentNodeIcon from 'frontend/shared/views/ContentNodeIcon.vue';
  import IconLightBulb from 'frontend/shared/views/IconLightBulb.vue';

  export default {
    name: 'RelatedResourcesView',
    components: {
      ContentNodeIcon,
      IconLightBulb,
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
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
    },
    $trs: {
      previewHelpText: `All related resources are displayed as recommendations
        when learners engage with this resource`,
      showPreviewBtnLabel: 'Show me',
      resourcePreviewDialogTitle: 'Related resources',
      resourcePreviewDialogHelpText: `In Kolibri, all related resources display as recommendations
        alongside the resource that a learner is currently engaging with`,
      dialogCloseBtnLabel: 'Close',
      previousStepsTitle: 'Previous steps',
      previousStepsExplanation: `Previous steps recommend resources showing skills or concepts
        that may beneeded in order to use this resource`,
      addPreviousStepBtnLabel: 'Add previous step',
      nextStepsTitle: 'Next steps',
      nextStepsExplanation: `Next steps recommend resources that build on skills
        or concepts learned in this resource`,
      addNextStepBtnLabel: 'Add next step',
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
