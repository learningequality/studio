<template>

  <VContainer class="panel pa-0">
    <VBreadcrumbs v-if="ancestors.length" :items="ancestors" class="pa-1">
      <template v-slot:divider>
        <Icon>chevron_right</Icon>
      </template>
      <template v-slot:item="props">
        <span class="px-2 notranslate">
          {{ props.item.title }}
        </span>
      </template>
    </VBreadcrumbs>
    <ToolBar flat dense color="white">
      <VCheckbox color="primary" hide-details />
      <VSpacer />
      <VToolbarItems>
        <IconButton icon="list" :text="$tr('customViewButton')" />
        <VMenu v-if="canEdit" offset-y>
          <template #activator="{ on }">
            <VBtn color="primary" style="height: 32px;" v-on="on">
              {{ $tr('addButton') }}
              <Icon small>
                arrow_drop_down
              </Icon>
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
      </VToolbarItems>
    </ToolBar>
    <VLayout row>
      <VFlex class="pa-4">
        <template v-for="child in children">
          <VLayout :key="child.id" row wrap>
            <VFlex xs9>
              <router-link :to="treeLink(child)">
                <ContentNodeIcon :kind="child.kind" />
                <span>{{ child.title }}</span>
              </router-link>
            </VFlex>
            <VFlex xs1>
              <VBtn icon :to="editNodeLink(child.id)">
                <VIcon>edit</VIcon>
              </VBtn>
            </VFlex>
            <VFlex xs1>
              <VBtn icon @click="deleteContentNode(child.id)">
                <VIcon>clear</VIcon>
              </VBtn>
            </VFlex>
          </VLayout>
        </template>
      </VFlex>
      <v-expand-x-transition>
        <VFlex
          v-show="showResourceDrawer"
          style="width: 500px;max-width: 500px;border-left: 1px solid #eee;"
          class="pa-4"
        >
          <div style="width: 100%;">
            <ResourcePanel v-if="detailNodeId" :nodeId="detailNodeId" @close="closePanel">
              <template #actions>
                <IconButton small icon="edit" :text="$tr('editButton')" />
              </template>
            </ResourcePanel>
          </div>
        </VFlex>
      </v-expand-x-transition>

    </VLayout>

  </VContainer>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../constants';
  import ResourcePanel from './ResourcePanel';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'NodePanel',
    components: {
      ContentNodeIcon,
      IconButton,
      ToolBar,
      ResourcePanel,
    },
    props: {
      parentId: {
        type: String,
        required: true,
      },
      detailNodeId: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        showResourceDrawer: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren']),
      // node() {
      //   return this.getContentNode(this.parentId);
      // },
      children() {
        return this.getContentNodeChildren(this.parentId);
      },
      ancestors() {
        return [{ title: 'channel' }, { title: 'topic 1' }];
      },
      parentTitle() {
        return this.getContentNode(this.parentId).title;
      },
      uploadFilesLink() {
        return { name: RouterNames.UPLOAD_FILES };
      },
    },
    watch: {
      detailNodeId(value) {
        this.showResourceDrawer = Boolean(value);
      },
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode', 'deleteContentNode']),
      newContentNode(route, { kind, title }) {
        this.createContentNode({ parent: this.parentId, kind, title }).then(newId => {
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
      editNodeLink(id) {
        return {
          name: RouterNames.VIEW_CONTENTNODES,
          params: {
            detailNodeIds: id,
          },
        };
      },
      treeLink(node) {
        if (node.kind === 'topic') {
          return {
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: node.id,
            },
          };
        }
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.parentId,
            detailNodeId: node.id,
          },
        };
      },
      closePanel() {
        this.showResourceDrawer = false;
        // Setting this so the contenst of drawer don't disappear
        // while the drawer is closing
        setTimeout(() => {
          this.$router.push({
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: this.$route.params.nodeId,
              detailNodeId: null,
            },
          });
        }, 700);
      },
    },

    $trs: {
      customViewButton: 'Change view',
      addTopic: 'Add topic',
      addExercise: 'Create exercise',
      uploadFiles: 'Upload files',
      topicDefaultTitle: '{parentTitle} topic',
      exerciseDefaultTitle: '{parentTitle} exercise',
      addButton: 'Add',
      editButton: 'Edit',
    },
  };

</script>

<style scoped>
  .panel {
    align-self: flex-start;
    height: 100%;
    background-color: white;
  }
</style>
