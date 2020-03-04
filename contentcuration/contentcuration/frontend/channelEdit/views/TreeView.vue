<template>

  <VContainer fluid class="pa-0 fill-height">
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
    <VNavigationDrawer permanent :style="{backgroundColor: $vuetify.theme.greyBackground}">
      <VToolbar dense flat color="greyBackground">
        <IconButton icon="remove" :text="$tr('collapseAllButton')" />
        <VSpacer />
      </VToolbar>
      <StudioTree :nodeId="rootId" :root="true" />
    </VNavigationDrawer>
    <NodePanel :parentId="nodeId" />
    <router-view />
  </VContainer>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { RouterNames } from '../constants';
  import StudioTree from './StudioTree';
  import NodePanel from './NodePanel';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'TreeView',
    components: {
      NodePanel,
      StudioTree,
      IconButton,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'rootId']),
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode']),
      newContentNode() {
        this.createContentNode({ parent: this.nodeId }).then(newId => {
          this.$router.push({
            name: RouterNames.CONTENTNODE_DETAILS,
            params: { detailNodeId: newId },
          });
        });
      },
    },
    $trs: {
      addNode: 'Add node',
      collapseAllButton: 'Collapse all',
    },
  };

</script>


<style lang="less" scoped>

</style>
