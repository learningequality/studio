<template>

  <VContainer fluid class="pa-0 fill-height">
    <ResizableNavigationDrawer
      permanent
      clipped
      localName="topic-tree"
      :maxWidth="700"
      :minWidth="175"
      :style="{backgroundColor: $vuetify.theme.backgroundColor}"
    >
      <VToolbar dense flat color="backgroundColor">
        <IconButton icon="collapse_all" :text="$tr('collapseAllButton')">
          $vuetify.icons.collapse_all
        </IconButton>
        <VSpacer />
      </VToolbar>
      <div style="margin-left: -24px;">
        <StudioTree :nodeId="rootId" :root="true" />
      </div>
    </ResizableNavigationDrawer>
    <CurrentTopicView :topicId="nodeId" :detailNodeId="detailNodeId" />
    <router-view />
  </VContainer>

</template>


<script>

  import { mapGetters } from 'vuex';
  import StudioTree from './StudioTree';
  import CurrentTopicView from './CurrentTopicView';
  import IconButton from 'shared/views/IconButton';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'TreeView',
    components: {
      StudioTree,
      IconButton,
      ResizableNavigationDrawer,
      CurrentTopicView,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      detailNodeId: {
        type: String,
        required: false,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['rootId']),
    },
    $trs: {
      collapseAllButton: 'Collapse all',
    },
  };

</script>


<style lang="less" scoped>

</style>
