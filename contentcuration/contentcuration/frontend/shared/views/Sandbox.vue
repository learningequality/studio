<template>
  <div>
    Insert component here for testing!
    <TemplateComponent />
    <MoveModal
      :key="nodeId"
      :nodeId="nodeId"
      :showDialog="showMoveModal"
      @showTopicModal="showTopicModal()"
      @cancelMove="showMoveModal = false"
    />
  </div>
</template>
<script>
import TemplateComponent from '../../channelEdit/views/template/Template';
import MoveModal from '../../channelEdit/views/template/MoveModal';

export default {
  name: 'Sandbox',
  components: {
    TemplateComponent,
    MoveModal,
  },
  props: {
    nodeId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      showMoveModal: true,
    };
  },
};
</script>


<style lang="less" scoped>
</style>
