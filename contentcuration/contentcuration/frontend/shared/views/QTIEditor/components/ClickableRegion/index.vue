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
      ref="button"
      type="button"
      class="overlay-button"
      :class="{ 'is-text-target': textCursor }"
      :aria-label="ariaLabel"
      @click.stop="onClick"
    ></button>
    <div class="content-wrapper">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import { ref } from 'vue';

  export default {
    name: 'ClickableRegion',
    setup(props, { emit }) {
      const button = ref(null);

      function onClick(event) {
        if (props.suppressed) return;
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }
        emit('click', event);
      }
      return {
        button,
        onClick,
        // Public: lets a parent move focus to the region.
        // eslint-disable-next-line vue/no-unused-properties
        focus: () => button.value?.focus(),
      };
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
      /** A text cursor and no hover tint, for a region that opens an editor where it is clicked */
      textCursor: {
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

    &:hover:not(.is-text-target) {
      background-color: v-bind('$themeTokens.fineLine');
    }

    &.is-text-target {
      cursor: text;
    }

    &:focus-visible {
      outline: 2px solid v-bind('$themeTokens.focusOutline');
      outline-offset: 2px;
    }
  }

  /* No z-index: the stacking context it opens would trap the fixed toolbars and
    popovers of an editor in the slot. Being positioned and later in the DOM
    already paints this above the overlay button. */
  .content-wrapper {
    position: relative;
  }

</style>
