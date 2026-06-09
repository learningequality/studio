<template>

  <div>
    <div style="padding: 16px 24px 0">
      <div
        style="
  padding: 16px;
  color: #2196f3;
  background-color: transparent;
  border: 1px solid #2196f3;
  border-radius: 4px;
        "
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
  import QTIEditor from 'shared/views/QTIEditor/index';
  import { QtiInteraction } from 'shared/views/QTIEditor/constants';

  /**
   * Hardcoded items covering three interaction types so the closed-card
   * type label can be visually verified.
   */
  const INITIAL_ASSESSMENTS = [
    {
      id: 'demo-item-1',
      type: QtiInteraction.CHOICE,
      title: 'Which planet is closest to the Sun?',
    },
    {
      id: 'demo-item-2',
      type: QtiInteraction.EXTENDED_TEXT,
      title: 'Describe the water cycle in your own words.',
    },
    {
      id: 'demo-item-3',
      type: QtiInteraction.ORDER,
      title: 'Arrange these events in chronological order.',
    },
  ];

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
