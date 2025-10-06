<template>

  <div
    class="studio-chip"
    :class="chipClasses"
    :style="chipStyles"
  >
    <div
      class="studio-chip__content"
      :style="contentStyles"
    >
      <slot></slot>
    </div>
    <KButton
      v-if="closable"
      class="studio-chip__close"
      appearance="basic-link"
      size="small"
      icon="close"
      :style="closeButtonStyles"
      @click="handleClose"
    />
  </div>

</template>


<script>

  export default {
    name: 'StudioChip',
    props: {
      /**
       * Small size variant
       */
      small: {
        type: Boolean,
        default: false,
      },
      /**
       * Compact size variant (even smaller than small)
       */
      compact: {
        type: Boolean,
        default: false,
      },
      /**
       * Show close button
       */
      closable: {
        type: Boolean,
        default: false,
      },
      /**
       * Chip color variant
       */
      color: {
        type: String,
        default: 'default',
        validator: value => ['default', 'primary', 'error', 'success', 'neutral'].includes(value),
      },
      /**
       * Maximum width for content
       */
      maxWidth: {
        type: String,
        default: null,
      },
      /**
       * Label style (more rectangular)
       */
      label: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      chipClasses() {
        return {
          'studio-chip--small': this.small,
          'studio-chip--compact': this.compact,
          'studio-chip--closable': this.closable,
          'studio-chip--label': this.label,
          [`studio-chip--${this.color}`]: true,
        };
      },
      chipStyles() {
        const baseStyles = {
          backgroundColor: this.getBackgroundColor(),
          border: `1px solid ${this.getBorderColor()}`,
        };

        if (this.maxWidth) {
          baseStyles.maxWidth = this.maxWidth;
        }

        return baseStyles;
      },
      contentStyles() {
        return {
          color: this.getTextColor(),
        };
      },
      closeButtonStyles() {
        return {
          color: this.getTextColor(),
        };
      },
    },
    methods: {
      getBackgroundColor() {
        const colorMap = {
          default: this.$themeTokens.surface,
          primary: this.$themeBrand.primary.v_50,
          error: this.$themePalette.red.v_50,
          success: this.$themePalette.green.v_50,
          neutral: this.$themePalette.grey.v_50,
        };
        return colorMap[this.color] || colorMap.default;
      },
      getBorderColor() {
        const colorMap = {
          default: this.$themeTokens.fineLine,
          primary: this.$themeBrand.primary.v_100,
          error: this.$themePalette.red.v_100,
          success: this.$themePalette.green.v_100,
          neutral: this.$themePalette.grey.v_200,
        };
        return colorMap[this.color] || colorMap.default;
      },
      getTextColor() {
        const colorMap = {
          default: this.$themeTokens.text,
          primary: this.$themeBrand.primary.v_700,
          error: this.$themeTokens.error,
          success: this.$themeTokens.success,
          neutral: this.$themeTokens.text,
        };
        return colorMap[this.color] || colorMap.default;
      },
      handleClose() {
        /**
         * Emitted when close button is clicked
         */
        this.$emit('close');
      },
    },
  };

</script>


<style scoped>

  .studio-chip {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    padding: 4px 12px;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    border-radius: 16px;
    transition: all 0.2s ease-in-out;
  }

  .studio-chip--small {
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 12px;
  }

  .studio-chip--compact {
    padding: 2px 10px;
    font-size: 13px;
    border-radius: 14px;
  }

  .studio-chip--label {
    font-weight: 500;
    border-radius: 4px;
  }

  .studio-chip__content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .studio-chip__close {
    flex-shrink: 0;
    min-width: auto !important;
    margin: 0 4px 0 -4px;
  }

  .studio-chip--small .studio-chip__close {
    margin: 0 2px 0 -2px;
  }

  .studio-chip--compact .studio-chip__close {
    margin: 0 3px 0 -3px;
  }

</style>
