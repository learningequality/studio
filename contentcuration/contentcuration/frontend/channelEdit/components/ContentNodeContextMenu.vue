<template>

  <BaseMenu
    v-model="value"
    :position-x="positionX"
    :position-y="positionY"
    absolute
  >
    <VCard>
      <slot v-if="value">
        <ContentNodeOptions
          :nodeId="nodeId"
          :hideDetailsLink="hideDetailsLink"
        />
      </slot>
    </VCard>
  </BaseMenu>

</template>


<script>

  import ContentNodeOptions from './ContentNodeOptions';

  export default {
    name: 'ContentNodeContextMenu',
    components: {
      ContentNodeOptions,
    },
    props: {
      show: {
        type: Boolean,
        default: false,
        required: true,
      },
      positionX: {
        type: Number,
        default: 0,
      },
      positionY: {
        type: Number,
        default: 0,
      },
      nodeId: {
        type: String,
        required: true,
      },
      hideDetailsLink: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      value: {
        get() {
          return this.show;
        },
        // ignore
        set() {},
      },
    },
  };

</script>


<style scoped></style>
