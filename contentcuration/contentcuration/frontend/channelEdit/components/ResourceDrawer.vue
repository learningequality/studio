<template>

  <VExpandXTransition>
    <ResizableNavigationDrawer
      v-if="nodeId"
      ref="drawer"
      right
      :localName="localName"
      :minWidth="400"
      :maxWidth="700"
      :permanent="permanent"
      clipped
      v-bind="$attrs"
      @input="v => $emit('input', v)"
      @resize="v => $emit('resize', v)"
      @scroll="$emit('scroll', $event)"
    >
      <div
        class="pa-4"
        style="margin-bottom: 64px"
      >
        <ResourcePanel
          :nodeId="nodeId"
          :channelId="channelId"
          :useRouting="useRouting"
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

  import ResourcePanel from './ResourcePanel';
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
        default: null,
      },
      channelId: {
        type: String,
        required: false,
        default: null,
      },
      permanent: {
        type: Boolean,
        default: true,
      },
      useRouting: {
        type: Boolean,
        default: true,
      },
    },
    methods: {
      /**
       * @public
       * @return {number}
       */
      getWidth() {
        return this.$refs.drawer.getWidth();
      },
    },
  };

</script>


<style lang="scss" scoped></style>
