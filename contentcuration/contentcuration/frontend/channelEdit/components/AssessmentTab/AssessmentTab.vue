<template>

  <div>
    <div
      v-if="invalidItemsCount"
      class="incomplete-banner"
      role="status"
      :style="bannerStyle"
    >
      <KIcon
        icon="error"
        :color="$themeTokens.error"
      />
      <span :style="{ color: $themeTokens.error }">
        {{ $tr('incompleteItemsCountMessage', { invalidItemsCount }) }}
      </span>
    </div>

    <QTIEditor
      :assessments="assessmentItems"
      :allowFreeResponse="allowFreeResponse"
      @update="applyUpdate"
    />
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { computed, toRefs } from 'vue';

  import useAssessmentItems from '../../composables/useAssessmentItems';
  import QTIEditor from 'shared/views/QTIEditor/index';

  export default {
    name: 'AssessmentTab',
    components: {
      QTIEditor,
    },
    setup(props) {
      const { nodeId } = toRefs(props);
      const { windowIsSmall } = useKResponsiveWindow();
      const { assessmentItems, invalidItemsCount, allowFreeResponse, applyUpdate } =
        useAssessmentItems(nodeId);

      const bannerStyle = computed(() =>
        windowIsSmall.value ? {} : { maxWidth: '1200px', margin: '0 auto' },
      );

      return { assessmentItems, invalidItemsCount, allowFreeResponse, applyUpdate, bannerStyle };
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    $trs: {
      incompleteItemsCountMessage:
        '{invalidItemsCount} incomplete {invalidItemsCount, plural, one {question} other {questions}}',
    },
  };

</script>


<style lang="scss" scoped>

  .incomplete-banner {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 16px 32px 0;
    font-weight: bold;
  }

</style>
