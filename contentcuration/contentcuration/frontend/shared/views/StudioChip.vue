<template>

  <div
    ref="chip"
    class="studio-chip"
    :class="{
      'studio-chip--small': small,
    }"
    :style="chipStyles"
  >
    <div class="studio-chip__content">
      <div class="studio-chip__text">
        <slot>
          {{ text }}
        </slot>
      </div>

      <!-- KIconButton is suitable for the close button -->
      <KIconButton
        v-if="close"
        class="studio-chip__close"
        appearance="flat-button"
        :ariaLabel="removeLabel"
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
      text: {
        type: String,
        default: '',
      },
      small: {
        type: Boolean,
        default: false,
      },
      close: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        isActive: false,
      };
    },
    computed: {
      chipStyles() {
        const baseColor = this.$themePalette.grey.v_200;
        const activeColor = this.$themePalette.grey.v_300;

        return {
          backgroundColor: this.isActive ? activeColor : baseColor,
        };
      },
      removeLabel() {
        return `Remove ${this.text}`;
      },
    },
    methods: {
      handleClose() {
        this.$emit('close');
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
    white-space: nowrap;
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

    &__content {
      display: flex;
      gap: 6px;
      align-items: center;
      height: 100%;
    }
  }

</style>
