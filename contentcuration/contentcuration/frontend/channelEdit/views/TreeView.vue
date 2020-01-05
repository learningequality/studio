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
    <StudioTree :nodeId="nodeId" :root="true"/>
    <router-view/>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { generateTempId } from 'shared/utils';
  import { RouterNames } from '../constants';
  import StudioTree from './StudioTree';

  export default {
    name: 'TreeView',
    components: {
      StudioTree,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
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
        this.$router.push({ name: RouterNames.CONTENTNODE_DETAILS, params: { detailNodeId: this.newId } });
      },
    },
    $trs: {
      addNode: 'Add node',
    },
  };

</script>


<style lang="less" scoped>

</style>
