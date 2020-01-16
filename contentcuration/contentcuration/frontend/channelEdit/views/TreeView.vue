<template>

  <div>
    <VBtn
      v-if="canEdit"
      color="primary"
      fixed
      right
      fab
      :title="$tr('addNode')"
      @click="newContentNode"
    >
      <VIcon>add</VIcon>
    </VBtn>
    <VLayout row wrap>
      <VFlex xs6>
        <StudioTree :nodeId="rootId" :root="true" />
      </VFlex>
      <VFlex xs6>
        <NodePanel :parentId="nodeId" />
      </VFlex>
    </VLayout>
    <router-view />
  </div>

</template>


<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';
  import { RouterNames } from '../constants';
  import StudioTree from './StudioTree';
  import NodePanel from './NodePanel';
  import { generateTempId } from 'shared/utils';

  export default {
    name: 'TreeView',
    components: {
      NodePanel,
      StudioTree,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'rootId']),
      ...mapState({
        language: state => state.session.currentLanguage,
        preferences: state => state.session.preferences,
      }),
    },
    methods: {
      ...mapMutations('contentNode', {
        addContentNode: 'ADD_CONTENTNODE',
        removeContentNode: 'REMOVE_CONTENTNODE',
      }),
      newContentNode() {
        // Clear any previously existing dummy channelset
        this.removeContentNode(this.newId);
        this.newId = generateTempId();
        this.addContentNode({
          id: this.newId,
          name: '',
          description: '',
          language: this.preferences ? this.preferences.language : this.language,
        });
        this.$router.push({
          name: RouterNames.CONTENTNODE_DETAILS,
          params: { detailNodeId: this.newId },
        });
      },
    },
    $trs: {
      addNode: 'Add node',
    },
  };

</script>


<style lang="less" scoped>

</style>
