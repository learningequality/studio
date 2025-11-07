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
        :style="closeButtonStyles"
        :class="
          $computedClass({
            ':hover': { backgroundColor: $themePalette.grey.v_700 },
          })
        "
        :aria-label="removeLabel"
        data-test="remove-chip"
        @click.stop="handleClose"
      >
        <KIcon
          icon="delete"
          class="studio-chip__icon"
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
      closeButtonStyles() {
        return {
          backgroundColor: this.$themePalette.grey.v_300,
        };
      },
      iconColor() {
        return 'grey';
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
    transition: background-color 0.2s ease;
  }

  .studio-chip__icon {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 18px;
    transform: translate(-50%, -50%);
  }

</style>
