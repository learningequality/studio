<template>

  <div
    ref="chip"
    class="studio-chip"
    :style="chipStyles"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="studio-chip__content">
      <div class="studio-chip__text">
        <slot>
          {{ text }}
        </slot>
      </div>

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
      close: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        isHovered: false,
      };
    },
    computed: {
      chipStyles() {
        const baseColor = this.$themePalette.grey.v_200;
        const hoverColor = this.$themePalette.grey.v_300;

        return {
          backgroundColor: this.isHovered ? hoverColor : baseColor,
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
    padding: 2px 8px;
    margin: 2px;
    font-size: 12px;
    white-space: nowrap;
    cursor: default;
    user-select: none;
    border-radius: 12px;
    transition: all 0.2s ease;

    &__content {
      display: flex;
      gap: 6px;
      align-items: center;
      height: 100%;
    }
  }

</style>
