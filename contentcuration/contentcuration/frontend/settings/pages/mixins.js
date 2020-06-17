import transform from 'lodash/transform';
import { createTranslator } from 'shared/i18n';

/*
  Return mixin based on form fields passed in
  Sample form field data:
    {
      fieldName: {
        required: false,
        multiSelect: false,
        validator: value => Boolean(value)
      }
    }
*/
function _cleanMap(formFields) {
  // Make sure all fields have the relevant validator field
  return transform(
    formFields,
    (result, value, key) => {
      result[key] = value;
      // Make sure all fields have a validator
      // Some fields depend on other fields, so pass in
      // context to use in validator (e.g. checking an "other"
      // option may require a text field as a result)
      if (value.validator) {
        result[key].validator = value.validator;
      } else if (!value.required) {
        result[key].validator = () => true;
      } else if (value.multiSelect) {
        // eslint-disable-next-line no-unused-vars
        result[key].validator = (v, _) => Boolean(v.length);
      } else {
        // eslint-disable-next-line no-unused-vars
        result[key].validator = (v, _) => Boolean(v);
      }
    },
    {}
  );
}

const formStrings = createTranslator('formStrings', {
  errorText: 'Please fix {count, plural,\n =1 {# error}\n other {# errors}} below',
});

export function generateFormMixin(formFields) {
  const cleanedMap = _cleanMap(formFields);

  return {
    data() {
      return {
        // Store errors
        errors: {},

        // Store entries
        form: transform(
          formFields,
          (result, value, key) => {
            result[key] = value.multiSelect ? [] : '';
          },
          {}
        ),
      };
    },
    computed: {
      formStrings() {
        return formStrings;
      },

      // Create getters/setters for all items
      ...transform(
        cleanedMap,
        function(result, value, key) {
          result[key] = {
            get() {
              return this.form[key] || (value.multiSelect ? [] : '');
            },
            set(v) {
              this.$set(this.form, key, v);
              if (!value.validator(v, this)) {
                this.$set(this.errors, key, true);
              } else {
                this.$delete(this.errors, key);
              }
            },
          };
        },
        {}
      ),
    },
    methods: {
      /*
        For some reason, having an errorCount computed
        property doesn't get updated on form changes.
        Use methods to track errorCount and errorText instead
      */
      errorCount() {
        return Object.keys(this.errors).length;
      },
      errorText() {
        return this.formStrings.$tr('errorText', {
          count: this.errorCount(),
        });
      },
      clean() {
        return transform(
          cleanedMap,
          (result, value, key) => {
            result[key] = this[key];
            if (value.multiSelect) {
              result[key] = result[key] || [];
            } else {
              result[key] = (result[key] || '').trim();
            }
          },
          {}
        );
      },
      validate(formData) {
        this.errors = transform(
          cleanedMap,
          (result, value, key) => {
            if (!value.validator(formData[key], this)) {
              result[key] = true;
            }
          },
          {}
        );
        return !Object.keys(this.errors).length;
      },
      submit() {
        const formData = this.clean();
        if (this.validate(formData)) {
          this.onSubmit(formData);
        }
      },
      // eslint-disable-next-line no-unused-vars
      onSubmit(formData) {
        throw Error('Must implement onSubmit when using formMixin');
      },
      reset() {
        this.form = {};
        this.resetValidation();
      },
      resetValidation() {
        this.errors = {};
      },
    },
  };
}
