<template>

  <VApp>
    <VBtn @click="openModal('EDIT')">
      Edit Modal
    </VBtn>

    <VBtn @click="openModal('VIEW_ONLY')">
      View Only
    </VBtn>

    <VBtn @click="openModal('NEW_TOPIC')">
      Add Topic
    </VBtn>

    <VBtn @click="openModal('NEW_EXERCISE')">
      Add Exercise
    </VBtn>

    <VBtn @click="openModal('UPLOAD')">
      Upload File
    </VBtn>

    <VBtn @click="openOneNode('EDIT')">
      Edit Single Item
    </VBtn>
    <VBtn @click="openOneNode('VIEW_ONLY')">
      View Single Item
    </VBtn>

    <EditModal v-if="mode" ref="editmodal" @modalclosed="reset" />
  </VApp>

</template>
<script>

  import _ from 'underscore';

  import { mapMutations, mapState } from 'vuex';
  import EditModal from 'edit_channel/uploader/views/EditModal.vue';

  export default {
    name: 'Sandbox',
    components: {
      EditModal,
    },
    mounted() {
      this.openModal('UPLOAD');
    },
    methods: {
      ...mapMutations('edit_modal', {
        setNodes: 'SET_NODES',
        setMode: 'SET_MODE',
        reset: 'RESET_STATE',
      }),
      ...mapState('edit_modal', ['mode']),
      openModal(mode) {
        this.setMode(mode);
        let nodes = mode === 'VIEW_ONLY' || mode === 'EDIT' ? _.clone(window.nodes) : [];
        this.setNodes(nodes);
        this.$refs.editmodal.openModal();
      },
      openOneNode(mode) {
        this.setMode(mode);
        let nodes = [_.clone(window.nodes[0])];
        this.setNodes(nodes);
        this.$refs.editmodal.openModal();
      },
    },
  };

</script>


<style lang="less">

  html {
    overflow-y: auto !important;
    .title,
    .headline,
    .display,
    .display-1,
    .subheading,
    .v-toolbar__title,
    .v-chip__content {
      font-family: 'Noto Sans' !important;
    }
    .v-btn--flat,
    .v-tabs__item {
      font-weight: bold;
      cursor: pointer;
    }
    .material-icons * {
      font-family: 'Material Icons';
    }
  }

  body * {
    font-family: 'Noto Sans';
  }

  .v-card {
    outline-color: #8dc5b6;
  }

  .v-tooltip__content {
    max-width: 200px;
    text-align: center;
  }

</style>
