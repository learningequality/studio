<template>

  <VApp>
    <VLayout grid wrap>
      <VFlex v-for="file in files" :key="file.id" style="width: 220px; padding: 20px;">
        <Thumbnail
          v-model="file.thumbnail"
          :primaryFilePath="file.file_on_disk"
          :kind="file.kind"
          @encoded="setEncoding"
        />
      </VFlex>
    </VLayout>

    <br><br><br><br>
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

  import clone from 'lodash/clone';

  import { mapMutations, mapState } from 'vuex';
  import Thumbnail from './Thumbnail';
  import EditModal from 'edit_channel/uploader/views/EditModal';

  export default {
    name: 'Sandbox',
    components: {
      EditModal,
      Thumbnail,
    },
    data() {
      return {
        files: [
          {
            id: 'test',
            thumbnail: null,
            file_on_disk:
              'http://localhost:9000/content/storage/9/5/95ef56e570209927ccdd26a15275fd7c.mp4',
            file_format: 'mp4',
            mimetype: 'video/mp4',
            kind: 'video',
          },
          {
            id: 'test',
            thumbnail: null,
            file_on_disk:
              'http://localhost:9000/content/storage/d/b/db2f9ef6dbd370f6932047b4011b93dc.pdf',
            file_format: 'pdf',
            kind: 'document',
          },
          {
            id: 'test',
            thumbnail: null,
            file_on_disk:
              'http://localhost:9000/content/storage/8/4/84867dd77ed34d3ee04083bc7253142a.epub',
            file_format: 'epub',
            kind: 'document',
          },
          {
            id: 'test',
            thumbnail: null,
            file_on_disk:
              'http://localhost:9000/content/storage/7/d/7d1702abc750dc9bec546e39a6f8fc49.mp3',
            file_format: 'mp3',
            kind: 'audio',
          },
          {
            id: 'test',
            thumbnail: null,
            file_on_disk:
              'http://localhost:9000/content/storage/3/7/37611fe289dc587a5833e1d55cd3055a.zip',
            file_format: 'zip',
            checksum: '37611fe289dc587a5833e1d55cd3055a',
            kind: 'html5',
          },
        ],
      };
    },
    mounted() {
      this.openOneNode('EDIT');
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
        let nodes = mode === 'VIEW_ONLY' || mode === 'EDIT' ? clone(window.nodes) : [];
        this.setNodes(nodes);
        this.$refs.editmodal.openModal();
      },
      openOneNode(mode) {
        this.setMode(mode);
        let nodes = [clone(window.nodes[0])];
        this.setNodes(nodes);
        this.$refs.editmodal.openModal();
      },
      setEncoding(value) {
        this.encoding = value;
      },
    },
  };

</script>
