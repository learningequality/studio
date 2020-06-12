import transform from 'lodash/transform';

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
      if (!value.validator) {
        result[key].validator = value.required ? Boolean : () => true;
      }
    },
    {}
  );
}

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
            result[key] = undefined;
          },
          {}
        ),
      };
    },
    computed: {
      // Create getters/setters for all items
      ...transform(
        cleanedMap,
        (result, value, key) => {
          result[key] = {
            get() {
              return this.form[key] || (value.multiSelect ? [] : '');
            },
            set(v) {
              this.form[key] = v;
              if (!value.validator(v)) {
                this.errors[key] = true;
              } else {
                delete this.errors[key];
              }
            },
          };
        },
        {}
      ),
    },
    methods: {
      clean() {
        return transform(
          cleanedMap,
          (result, value, key) => {
            result[key] = value.multiSelect ? this[key] : this[key].trim();
          },
          {}
        );
      },
      validate(formData) {
        this.errors = transform(
          cleanedMap,
          (result, value, key) => {
            if (!value.validator(formData[key])) {
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
        this.errors = {};
      },
    },
  };
}
