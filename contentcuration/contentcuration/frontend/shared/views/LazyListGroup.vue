<template>

  <section class="list-group" :class="{ open }">
    <header
      class="list-group-header"
      @click="open = !open"
    >
      <div v-if="prependIcon" class="icon-container">
        <VIconWrapper>{{ prependIcon }}</VIconWrapper>
      </div>
      <div class="header-content" :class="{ 'has-icon': appendIcon || prependIcon }">
        <slot name="header"></slot>
      </div>
      <div v-if="appendIcon" class="icon-container">
        <VIconWrapper>{{ appendIcon }}</VIconWrapper>
      </div>
    </header>
    <VExpandTransition>
      <div
        v-if="hasOpened"
        v-show="showContent"
        class="list-group-content"
      >
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
    data() {
      return {
        hasOpened: false,
        showContent: false,
      };
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
    watch: {
      value(open) {
        if (open) {
          this.hasOpened = true;
        }

        // Delay show to next tick after open
        this.$nextTick(() => {
          this.showContent = open;
        });
      },
    },
  };

</script>

<style lang="scss" scoped>

  $icon-padding: 16px;
  $icon-width: 25px;
  $header-width: calc(2 * #{$icon-padding} + #{$icon-width});

  .list-group {
    box-sizing: border-box;
    max-width: 100%;
  }

  .list-group-header {
    white-space: nowrap;
    cursor: pointer;
  }

  .header-content,
  .list-group-header,
  .list-group-content {
    width: 100%;
  }

  .header-content,
  .icon-container {
    display: inline-block;
    white-space: normal;
    vertical-align: middle;
  }

  .header-content.has-icon {
    width: calc(100% - #{$header-width});
  }

  .list-group.open > .list-group-header .v-icon {
    transform: rotate(-180deg);
  }

  .icon-container {
    box-sizing: border-box;
    width: $icon-width;
    padding: 0 $icon-padding;
  }
  
</style>
