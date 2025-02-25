<template>

  <component
    :is="component"
    :id="id"
    style="position: relative"
    v-bind="$attrs"
  >
    <slot
      name="default"
      :attach="`#${id}`"
      :menuProps="menuProps"
    ></slot>
  </component>

</template>


<script>

  import { v4 as uuidv4 } from 'uuid';
  import { animationThrottle } from 'shared/utils/helpers';

  /**
   * Wrapper component that defines an ID for using with Vuetify's `:attach` so that
   * absolute positioned dropdowns will remain attached next to the wrapped field/component
   */
  export default {
    name: 'DropdownWrapper',
    props: {
      id: {
        type: String,
        default() {
          return `DropdownWrapper_${uuidv4().split('-').pop()}`;
        },
      },
      component: {
        type: String,
        default: 'div',
      },
      menuHeight: {
        type: [Number, String],
        default: 300,
        validator: value => {
          const parsed = parseInt(value, 10);
          return !isNaN(parsed) && parsed > 0;
        },
      },
    },
    data() {
      return {
        top: false,
      };
    },
    computed: {
      menuProps() {
        return {
          offsetY: true,
          zIndex: 4,
          top: this.top,
          maxHeight: this.menuHeight,
          lazy: true,
          contentClass: this.$isRTL ? 'forceRTLMenu' : '',
        };
      },
    },
    /**
     * TODO: this logic doesn't handle if the page is resized, which could occur
     * from viewport rotation on a tablet
     */
    mounted() {
      let scrollableAncestor = this.$el;

      // Go upwards in the DOM finding the nearest ancestor that's scrollable
      // Note: it ideally it should be `<= 0` instead of `<= 1`
      while (
        scrollableAncestor &&
        (scrollableAncestor.scrollHeight - scrollableAncestor.clientHeight <= 1 ||
          !/auto|scroll/.test(window.getComputedStyle(scrollableAncestor).overflowY))
      ) {
        if (!scrollableAncestor.parentNode) {
          break;
        }
        scrollableAncestor = scrollableAncestor.parentNode;

        // Stop if we reach the body-- tagName is likely uppercase
        if (/body/i.test(scrollableAncestor.tagName)) {
          break;
        }
      }

      const scrollableBoundingRect = scrollableAncestor.getBoundingClientRect();

      // Listen for scrolls and update `top` according to whether there's enough space to render
      // the dropdown below the element
      const scrollListener = animationThrottle(() => {
        this.top =
          this.$el.getBoundingClientRect().bottom + this.menuHeight > scrollableBoundingRect.bottom;
      });
      scrollableAncestor.addEventListener('scroll', scrollListener);
      // call the scroll listener to initialize `top`
      scrollListener();
    },
  };

</script>


<style>

  /* According to the documentation, Vuetify supposedly supports a `right` prop to position the menu
   on the right side, but there isn't any code that actually does this. So when using an RTL
   language, this class will be applied and these will get flipped, because our intention is
   left:auto and right:0
 */
  .forceRTLMenu {
    right: auto !important;
    left: 0 !important;
  }

</style>
