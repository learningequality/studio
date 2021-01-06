<script>

  import { VMenu } from 'vuetify/lib/components/VMenu';

  export default {
    name: 'Menu',
    extends: VMenu,
    props: {
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
    },
  };

</script>

<style lang="less" scoped>

</style>
