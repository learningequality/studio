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
  import { CHOICE_ITEM_XML, MULTI_CHOICE_ITEM_XML } from './qtiDemoData';
  import QTIEditor from 'shared/views/QTIEditor/index';
  import { QtiInteraction } from 'shared/views/QTIEditor/constants';

  /**
   * Hardcoded items covering different states:
   *  - item-1: has raw_data (real QTI XML) → exercises the full load path
   *  - item-2: no raw_data → shows placeholder (blank new item state)
   *  - item-3: no raw_data → shows placeholder
   */
  const INITIAL_ASSESSMENTS = [
    {
      id: 'demo-item-1',
      type: QtiInteraction.CHOICE,
      title: 'Which planet is closest to the Sun?',
      raw_data: CHOICE_ITEM_XML,
    },
    {
      id: 'demo-item-2',
      type: QtiInteraction.CHOICE,
      title: 'Select all the prime numbers.',
      raw_data: MULTI_CHOICE_ITEM_XML,
    },
    {
      id: 'demo-item-3',
      type: QtiInteraction.EXTENDED_TEXT,
      title: 'Describe the water cycle in your own words.',
    },
    {
      id: 'demo-item-4',
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
