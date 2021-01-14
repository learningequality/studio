<script>

  import { VCheckbox } from 'vuetify/lib/components/VCheckbox';

  export default {
    name: 'Checkbox',
    extends: VCheckbox,
    props: {
      /* eslint-disable kolibri/vue-no-unused-properties */
      color: {
        type: String,
        default: 'primary',
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
    padding: 0 8px;
    color: var(--v-text);
  }

</style>
