<template>

  <div>
    <div style="padding: 16px 24px 0">
      <div
        :style="{
          padding: '16px',
          color: $themePalette.blue.v_600,
          backgroundColor: 'transparent',
          border: `1px solid ${$themePalette.blue.v_600}`,
          borderRadius: '4px',
        }"
      >
        <strong>QTI Editor — Dev Demo</strong>
        &nbsp;Hardcoded items. Changes are local only and not persisted.
      </div>
    </div>

    <QTIEditor
      :assessments="assessments"
      @update="onUpdate"
    />
  </div>

</template>


<script>

  import { ref, defineComponent } from 'vue';
  import { INITIAL_ASSESSMENTS } from './qtiDemoData';
  import QTIEditor from 'shared/views/QTIEditor/index';

  export default defineComponent({
    name: 'QTIDemoPage',

    components: { QTIEditor },

    setup() {
      const assessments = ref(INITIAL_ASSESSMENTS);

      function onUpdate(newList) {
        assessments.value = newList;
      }

      return { assessments, onUpdate };
    },
  });

</script>
