<template>

  <VContainer fluid class="pa-0 fill-height">
    <VMenu v-if="canEdit" offset-y>
      <template #activator="{ on }">
        <VBtn color="primary" fab fixed right v-on="on">
          <Icon>add</Icon>
        </VBtn>
      </template>
      <VList>
        <VListTile @click="newTopicNode">
          <VListTileTitle>{{ $tr('addTopic') }}</VListTileTitle>
        </VListTile>
        <VListTile @click="newExerciseNode">
          <VListTileTitle>{{ $tr('addExercise') }}</VListTileTitle>
        </VListTile>
        <VListTile :to="uploadFilesLink">
          <VListTileTitle>{{ $tr('uploadFiles') }}</VListTileTitle>
        </VListTile>
      </VList>
    </VMenu>
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
      ...mapGetters('contentNode', ['getContentNode']),
      uploadFilesLink() {
        return { name: RouterNames.UPLOAD_FILES };
      },
      parentTitle() {
        return this.getContentNode(this.nodeId).title;
      },
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode']),
      newContentNode(route, { kind, title }) {
        this.createContentNode({ parent: this.nodeId, kind, title }).then(newId => {
          this.$router.push({
            name: route,
            params: { detailNodeIds: newId },
          });
        });
      },
      newTopicNode() {
        let nodeData = {
          kind: 'topic',
          title: this.$tr('topicDefaultTitle', { parentTitle: this.parentTitle }),
        };
        this.newContentNode(RouterNames.ADD_TOPICS, nodeData);
      },
      newExerciseNode() {
        let nodeData = {
          kind: 'exercise',
          title: this.$tr('exerciseDefaultTitle', { parentTitle: this.parentTitle }),
        };
        this.newContentNode(RouterNames.ADD_EXERCISE, nodeData);
      },
    },
    $trs: {
      collapseAllButton: 'Collapse all',
      addTopic: 'Add topic',
      addExercise: 'Create exercise',
      uploadFiles: 'Upload files',
      topicDefaultTitle: '{parentTitle} topic',
      exerciseDefaultTitle: '{parentTitle} exercise',
    },
  };

</script>


<style lang="less" scoped>

</style>
