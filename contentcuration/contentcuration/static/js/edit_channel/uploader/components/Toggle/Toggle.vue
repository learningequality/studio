<template>
  <div>
    <VIcon
      v-if="isOpen"
      data-test="iconArrowUp"
      @click="close"
    >
      keyboard_arrow_up
    </VIcon>
    <VIcon
      v-else
      data-test="iconArrowDown"
      @click="open"
    >
      keyboard_arrow_down
    </VIcon>
  </div>
</template>

<script>

  export default {
    name: 'Toggle',
    props: {
      isOpen: {
        type: Boolean,
        default: false,
      },
    },
    methods: {
      close() {
        this.$emit('close');
      },
      open() {
        this.$emit('open');
      },
    },
  };

</script>
