<script>

  import KCheckbox from 'kolibri-design-system/lib/KCheckbox';
  import isBoolean from 'lodash/isBoolean';
  import isArray from 'lodash/isArray';
  import isObject from 'lodash/isObject';

  export default {
    name: 'Checkbox',
    extends: KCheckbox,
    model: {
      prop: 'checked',
    },
    props: {
      /* eslint-disable kolibri/vue-no-unused-properties */
      value: {
        type: [Boolean, String, Number, Object, Array],
        default: true,
      },
      /* eslint-enable kolibri/vue-no-unused-properties */
    },
    created() {
      this.$on('change', checked => {
        let falsyVal = null;
        if (isArray(this.value)) {
          falsyVal = [];
        } else if (isObject(this.value)) {
          falsyVal = {};
        } else if (isBoolean(this.value)) {
          falsyVal = false;
        }
        this.$emit('input', checked ? this.value : falsyVal);
      });
    },
  };

</script>
