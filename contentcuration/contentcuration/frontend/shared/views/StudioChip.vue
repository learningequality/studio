<template>

  <div
    ref="chip"
    class="studio-chip"
    :style="chipStyles"
  >
    <div class="studio-chip__content">
      <div class="studio-chip__text">
        <slot>
          {{ text }}
        </slot>
      </div>

      <button
        v-if="close"
        class="studio-chip__close"
        :aria-label="removeLabel"
        data-test="remove-chip"
        @click.stop="handleClose"
      >
        <KIcon
          icon="delete"
          class="studio-chip__icon"
          :class="
            $computedClass({
              ':hover': { color: 'black' },
            })
          "
          :color="iconColor"
        />
      </button>
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
    computed: {
      chipStyles() {
        const baseColor = this.$themePalette.grey.v_200;
        return {
          backgroundColor: baseColor,
        };
      },
      iconColor() {
        const baseColor = 'grey';
        return baseColor;
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
    font-size: 13px;
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

    &__text {
      display: flex;
      align-items: center;
      margin-bottom: 2px;
    }
  }

  .studio-chip__close {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    margin-top: 2px;
    margin-left: 2px;
    cursor: pointer;
    border-radius: 50%;
  }

  .studio-chip__icon {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 18px;
    transition: color 0.2s ease;
    transform: translate(-50%, -50%);
  }

</style>
