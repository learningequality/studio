<script>

  import { VMenu } from 'vuetify/lib/components/VMenu';

  export default {
    name: 'BaseMenu',
    extends: VMenu,
    props: {
      /* eslint-disable vue/no-unused-properties */
      left: {
        type: Boolean,
        default() {
          return this.$isRTL;
        },
      },
      right: {
        type: Boolean,
        default() {
          return !this.$isRTL;
        },
      },
      offsetY: {
        type: Boolean,
        default: true,
      },
      lazy: {
        type: Boolean,
        default: true,
      },
      /* eslint-enable vue/no-unused-properties */
    },
  };

</script>


<style lang="scss" scoped></style>
