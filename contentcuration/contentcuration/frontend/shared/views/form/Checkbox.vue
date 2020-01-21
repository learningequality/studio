<script>

  import { VCheckbox } from 'vuetify/lib';

  export default {
    name: 'Checkbox',
    extends: VCheckbox,
    props: {
      /* eslint-disable kolibri/vue-no-unused-properties */
      color: {
        type: String,
        default: 'purple',
      },
      hideDetails: {
        type: Boolean,
        default: true,
      },
      /* eslint-enable kolibri/vue-no-unused-properties */
    },
  };

</script>


<style lang="less" scoped>

  /deep/ label.theme--light {
    color: rgba(0, 0, 0, 0.87);
  }

</style>
