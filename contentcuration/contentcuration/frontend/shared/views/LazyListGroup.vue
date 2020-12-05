<template>

  <section class="list-group" :class="{ open }">
    <VLayout
      tag="header"
      class="list-group-header"
      align-center
      @click="open = !open"
    >
      <VFlex v-if="prependIcon" shrink class="icon-container">
        <Icon>{{ prependIcon }}</Icon>
      </VFlex>
      <div class="grow header-content">
        <slot name="header"></slot>
      </div>
      <VFlex v-if="appendIcon" shrink class="icon-container">
        <Icon>{{ appendIcon }}</Icon>
      </VFlex>
    </VLayout>
    <VExpandTransition>
      <div v-if="open" class="list-group-content">
        <slot></slot>
      </div>
    </VExpandTransition>
  </section>

</template>

<script>

  export default {
    name: 'LazyListGroup',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      appendIcon: {
        type: String,
        default: null,
      },
      prependIcon: {
        type: String,
        default: null,
      },
    },
    computed: {
      open: {
        get() {
          return this.value;
        },
        set(open) {
          this.$emit('input', open);
        },
      },
    },
  };

</script>

<style lang="less" scoped>

  .list-group {
    box-sizing: border-box;
    max-width: 100%;
  }

  .list-group-header {
    cursor: pointer;
  }

  .list-group.open > .list-group-header .v-icon {
    transform: rotate(-180deg);
  }

  .icon-container {
    padding: 0 16px;
  }

  .header-content,
  .list-group-header,
  .list-group-content {
    max-width: 100%;
  }

</style>
