<template>

  <VExpandXTransition>
    <ResizableNavigationDrawer
      v-if="nodeId"
      right
      :localName="localName"
      :minWidth="400"
      :maxWidth="700"
      permanent
      clipped
      v-bind="$attrs"
    >
      <div class="pa-4" style="margin-bottom: 64px;">
        <ResourcePanel
          :nodeId="nodeId"
          :channelId="currentChannel.id"
          @close="$emit('close')"
        >
          <template #navigation>
            <!-- Slot for elements like "Back" link -->
            <slot name="navigation"></slot>
          </template>
          <template #actions>
            <!-- Slot for elements like edit button -->
            <slot name="actions"></slot>
          </template>
        </ResourcePanel>
      </div>
    </ResizableNavigationDrawer>
  </VExpandXTransition>

</template>
<script>

  import { mapGetters } from 'vuex';
  import ResourcePanel from '../views/ResourcePanel';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'ResourceDrawer',
    components: {
      ResizableNavigationDrawer,
      ResourcePanel,
    },
    props: {
      // key for sessionStorage to store width data at
      localName: {
        type: String,
        default: 'resource-panel',
      },
      nodeId: {
        type: String,
        required: false,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel']),
    },
  };

</script>
<style lang="less" scoped>

</style>
