<template>

  <div>
    <img
      :src="src"
      :alt="alternateText"
      :style="styleObject"
      @error="onError"
    >
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'KImg',
    props: {
      /**
       * Sets the image path
       */
      src: {
        type: String,
        default: null,
      },
      /**
       * Alternate text for the image. This is required and will
       * throw a warning when it's not provided (empty) unless isDecorative is true
       */
      altText: {
        type: String,
        default: '',
      },
      /**
       * Sets the image as decorative. This sets the alt image property to an empty string.
       */
      isDecorative: {
        type: Boolean,
        default: false,
      },
      /**
       * Sets the height for the component
       */
      height: {
        type: [Number, String],
        default: undefined,
      },
      /**
       * Sets the width for the component
       */
      width: {
        type: [Number, String],
        default: undefined,
      },
      /**
       * Sets the maximum height for the component
       */
      maxHeight: {
        type: [Number, String],
        default: undefined,
      },
      /**
       * Sets the minimum height for the component
       */
      minHeight: {
        type: [Number, String],
        default: undefined,
      },
      /**
       * Sets the maximum width for the component
       */
      maxWidth: {
        type: [Number, String],
        default: undefined,
      },
      /**
       * 	Sets the minimum width for the component
       */
      minWidth: {
        type: [Number, String],
        default: undefined,
      },
      /**
       * Accepts a Vue dynamic styles object to override the default styles to modify the appearance
       * of the component.
       * It's attributes always take precedence over any specified styling (internal
       *  component's styles, styles calculated from props etc.)
       */
      appearanceOverrides: {
        type: Object,
        default: () => ({}),
      },
    },
    
    data() {
      return {
        styleObject: {
          height: this.height,
          width: this.width,
          maxHeight: this.imgMaxHeight,
          minHeight: this.imgMinHeight,
          maxWidth: this.imgMaxWidth,
          minWidth: this.imgMinWidth,
          ...this.appearanceOverrides,
        },
      };
    },
    computed: {
      alternateText() {
        return this.isDecorative ? '' : this.altText;
      },
      // imgHeight() {
      //   return this.validateAndFormatUnits(this.height);
      // },
      // imgWidth() {
      //   return this.validateAndFormatUnits(this.width);
      // },
      imgMaxHeight() {
        return this.validateAndFormatUnits(this.maxHeight);
      },
      imgMinHeight() {
        return this.validateAndFormatUnits(this.minHeight);
      },
      imgMaxWidth() {
        return this.validateAndFormatUnits(this.maxWidth);
      },
      imgMinWidth() {
        return this.validateAndFormatUnits(this.minWidth);
      },
    },
    created() {
      if (!this.isDecorative && !this.altText) {
        throw new Error('Missing required prop - provide altText or indicate isDecorative');
      }
    },
    methods: {
      validateAndFormatUnits(propValue) {
        if (propValue) {
          if (!isNaN(propValue)) {
            console.log("its a number");
            return `${propValue}px`;
          } else {
            console.log("its not a number");
            // split numbers apart from units
            const [, ...arr] = propValue.match(/(\d*\.?\d+)([a-zA-Z | %]*)/);
            const validUnits = [
              '%',
              'cm',
              'em',
              'ex',
              'ch',
              'in',
              'lh',
              'mm',
              'px',
              'rem',
              'rlh',
              'vh',
              'vw',
            ];

            // if made up of valid numbers and valid units
            if (!isNaN(arr[0]) && validUnits.includes(arr[1])) {
              return propValue;
            }
          }
        }
      },
      onError(event) {
        /**
         * Emitted when the image fails to load. The DOM event that
         * triggered the error is available in the payload.
         */
        this.$emit('error', event);
      },
    },
  };

</script>


<style scoped></style>