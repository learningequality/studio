<template>

  <!--
    a11y: Outer div catches mouse clicks.
    Keyboard a11y is handled by the hidden button overlay below.
  -->
  <div
    class="clickable-area"
    @click="onClick"
  >
    <button
      v-if="!suppressed"
      type="button"
      class="overlay-button"
      :aria-label="ariaLabel"
      @click.stop="onClick"
    ></button>
    <div class="content-wrapper">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'ClickableRegion',
    setup(props, { emit }) {
      function onClick(event) {
        if (props.suppressed) return;
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }
        emit('click', event);
      }
      return { onClick };
    },
    props: {
      ariaLabel: {
        type: String,
        required: true,
      },
      suppressed: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['click'],
  };

</script>


<style lang="scss" scoped>

  .clickable-area {
    position: relative;
    border-radius: inherit;
  }

  .overlay-button {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: inherit;
    outline: none;

    &:hover {
      background-color: v-bind('$themeTokens.fineLine');
    }

    &:focus-visible {
      outline: 2px solid v-bind('$themeTokens.focusOutline');
      outline-offset: 2px;
    }
  }

  .content-wrapper {
    position: relative;
    z-index: 1;
  }

</style>
