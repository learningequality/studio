<template>

  <div class="formula">
    {{ value }}
  </div>

</template>


<script>

  export default {
    name: 'Formula',
    props: {
      value: {
        type: String,
        default: '',
      },
      editable: {
        type: Boolean,
        default: false,
      },
      mathQuill: {
        type: Function,
        default: () => {},
      },
    },
    data() {
      return {
        mathField: null,
      };
    },
    watch: {
      value(newValue) {
        if (!this.editable || newValue === this.mathField.latex()) {
          return;
        }

        this.mathField.write(newValue);
      },
    },
    mounted() {
      if (this.editable) {
        this.mathField = this.mathQuill.MathField(this.$el, {
          spaceBehavesLikeTab: true,
          handlers: {
            edit: () => {
              this.$emit('input', this.mathField.latex());
            },
          },
        });
      } else {
        this.mathQuill.StaticMath(this.$el);
      }
    },
    methods: {
      /**
       * @public
       */
      focus() {
        if (this.mathField && this.mathField instanceof this.mathQuill.EditableField) {
          this.mathField.focus();
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .formula {
    font-family: Symbola;
  }

</style>
