<template>

  <div
    class="studio-chip"
    :class="{
      'studio-chip--small': small,
      'studio-chip--clickable': close || $listeners.click,
      'studio-chip--active': isActive,
    }"
    :style="chipStyles"
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Chip content -->
    <div class="studio-chip__content">
      <!-- Chip text/content first -->
      <div class="studio-chip__text">
        <slot>
          {{ text }}
        </slot>
      </div>

      <!-- Close button for removable chips after text -->
      <KIconButton
        v-if="close"
        class="studio-chip__close"
        appearance="flat-button"
        icon="close"
        data-test="remove-chip"
        @click.stop="handleClose"
      />
    </div>
  </div>

</template>


<script>

  export default {
    name: 'StudioChip',
    props: {
      /**
       * Text content of the chip
       */
      text: {
        type: String,
        default: '',
      },
      /**
       * Whether the chip is small size
       */
      small: {
        type: Boolean,
        default: false,
      },
      /**
       * Whether to show close button
       */
      close: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        isActive: false,
        isHovered: false,
      };
    },
    computed: {
      chipStyles() {
        const isClickable = this.close || this.$listeners.click;
        const baseColor = this.$themePalette.grey.v_200;
        const hoverColor = this.$themePalette.grey.v_300;

        return {
          backgroundColor: this.isHovered && isClickable ? hoverColor : baseColor,
        };
      },
    },

    methods: {
      handleClick(event) {
        // Add active state for click feedback
        this.isActive = true;
        setTimeout(() => {
          this.isActive = false;
        }, 150);

        this.$emit('click', event);
      },
      handleClose() {
        // Emit both close and input events for compatibility
        this.$emit('close');
        this.$emit('input'); // This is what the original VChip @input was listening to
      },
    },
  };

</script>


<style lang="scss" scoped>

  .studio-chip {
    display: inline-flex;
    align-items: center;
    height: 24px;
    min-height: 24px;
    padding: 4px;
    margin: 2px;
    user-select: none;
    border-radius: 16px;
    transition: all 0.2s ease;

    /* Small variant - still 24px height */
    &--small {
      height: 24px;
      min-height: 24px;
      padding: 2px 8px;
      font-size: 12px;
      border-radius: 12px;
    }

    &--clickable {
      cursor: pointer;
    }

    &__content {
      display: flex;
      gap: 6px;
      align-items: center;
      height: 100%;
    }
  }

</style>
