<script>

  import { VTabs } from 'vuetify/lib/components/VTabs';

  /*
    RTL support on v-tabs is broken on overflow, so pull in
    fixes from this PR https://github.com/vuetifyjs/vuetify/pull/6812
  */

  export default {
    name: 'Tabs',
    extends: VTabs,
    props: {
      /* eslint-disable kolibri/vue-no-unused-properties */
      color: {
        type: String,
        default: 'transparent',
      },
      showArrows: {
        type: Boolean,
        default: true,
      },
      sliderColor: {
        type: String,
        default: 'primary',
      },
      /* eslint-enable kolibri/vue-no-unused-properties */
    },
    methods: {
      /* eslint-disable kolibri/vue-no-unused-methods */
      checkPrevIcon() {
        if (this.$vuetify.rtl)
          return this.widths.container > this.scrollOffset * -1 + this.widths.wrapper;

        return this.scrollOffset > 0;
      },
      checkNextIcon() {
        // Check one scroll ahead to know the width of right-most item
        if (this.$vuetify.rtl) return this.scrollOffset < 0;

        return this.widths.container > this.scrollOffset + this.widths.wrapper;
      },
      scrollIntoView() {
        if (!this.activeTab) return;
        if (!this.isOverflowing) return (this.scrollOffset = 0);
        if (this.$vuetify.rtl) return;
        const totalWidth = this.widths.wrapper + this.scrollOffset;
        const { clientWidth, offsetLeft } = this.activeTab.$el;
        const itemOffset = clientWidth + offsetLeft;
        let additionalOffset = clientWidth * 0.3;

        if (this.activeTab === this.items[this.items.length - 1]) {
          additionalOffset = 0; // don't add an offset if selecting the last tab
        }

        /* istanbul ignore else */
        if (offsetLeft < this.scrollOffset) {
          this.scrollOffset = Math.max(offsetLeft - additionalOffset, 0);
        } else if (totalWidth < itemOffset) {
          this.scrollOffset -= totalWidth - itemOffset - additionalOffset;
        }
      },
      newOffset(direction) {
        const clientWidth = this.$refs.wrapper.clientWidth;

        if (direction === 'prev') {
          if (this.$vuetify.rtl) {
            return Math.max(
              this.scrollOffset - clientWidth,
              (this.$refs.container.clientWidth - clientWidth) * -1
            );
          }
          return Math.max(this.scrollOffset - clientWidth, 0);
        } else {
          if (this.$vuetify.rtl) {
            return Math.min(this.scrollOffset + clientWidth, 0);
          }
          return Math.min(
            this.scrollOffset + clientWidth,
            this.$refs.container.clientWidth - clientWidth
          );
        }
      },
      onTouchEnd() {
        const container = this.$refs.container;
        const wrapper = this.$refs.wrapper;
        const maxScrollOffset = container.clientWidth - wrapper.clientWidth;
        container.style.transition = null;
        container.style.willChange = null;

        /* istanbul ignore else */
        if (this.$vuetify.rtl) {
          if (this.scrollOffset > 0 || !this.isOverflowing) {
            this.scrollOffset = 0;
          } else if (this.scrollOffset * -1 >= maxScrollOffset) {
            this.scrollOffset = maxScrollOffset * -1;
          }
        } else {
          if (this.scrollOffset < 0 || !this.isOverflowing) {
            this.scrollOffset = 0;
          } else if (this.scrollOffset >= maxScrollOffset) {
            this.scrollOffset = maxScrollOffset;
          }
        }
      },
      /* eslint-enable kolibri/vue-no-unused-methods */
    },
  };

</script>

<style lang="scss">

  /*! rtl:begin:ignore */
  [dir='rtl'] {
    .v-tabs__icon--prev {
      right: auto;
      left: 4px;
    }
  }

  /*! rtl:end:ignore */

</style>
