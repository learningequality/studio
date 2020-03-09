<template>

  <VContainer fluid class="pa-0 fill-height">
    <ResizableNavigationDrawer
      v-show="!isEmptyChannel"
      permanent
      clipped
      localName="topic-tree"
      :maxWidth="400"
      :minWidth="200"
      :style="{backgroundColor: $vuetify.theme.backgroundColor}"
    >
      <VLayout row>
        <IconButton icon="collapse_all" :text="$tr('collapseAllButton')">
          $vuetify.icons.collapse_all
        </IconButton>
        <VSpacer />
        <IconButton icon="gps_fixed" :text="$tr('openCurrentLocationButton')" />
      </VLayout>
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
      ...mapGetters('contentNode', ['getContentNodeChildren']),
      isEmptyChannel() {
        return !this.getContentNodeChildren(this.rootId).length;
      },
    },
    $trs: {
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Open to current location',
    },
  };

</script>


<style lang="less" scoped>

</style>
