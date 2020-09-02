<template>

  <component
    :is="tag"
    class="draggable-placeholder"
    :style="activeStyle"
  >
    <slot></slot>
  </component>

</template>


<script>

  export default {
    name: 'DraggablePlaceholder',
    inject: {
      draggableUniverse: { default: null },
      draggableRegionId: { default: null },
      draggableCollectionId: { default: null },
    },
    props: {
      tag: {
        type: String,
        default: 'div',
      },
      show: {
        type: Boolean,
        default: false,
        required: true,
      },
      height: {
        type: String,
        default: '10px',
      },
    },
    computed: {
      activeStyle() {
        const height = this.show ? this.height : '0px';
        return { height };
      },
    },
  };

</script>


<style lang="less" scoped>

  .draggable-placeholder {
    width: 100%;
    height: 0;
    overflow: hidden;
    background: #cccccc;
    transition: height ease 0.2s;
  }

</style>
