<template>

  <div
    class="studio-chip"
    :class="{ 'has-close-button': close }"
    :style="chipStyles"
  >
    <div class="content">
      <div class="text">
        <slot>
          {{ text }}
        </slot>
      </div>

      <button
        v-if="close"
        class="close-button"
        :class="closeButtonClass"
        :aria-label="removeLabel"
        type="button"
        data-test="remove-chip"
        @click.stop="handleClose"
      >
        <KIcon
          icon="delete"
          :color="$themePalette.grey.v_400"
          class="close-icon default-icon"
        />
        <KIcon
          icon="delete"
          :color="$themePalette.grey.v_900"
          class="close-icon hover-icon"
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
      removeLabel() {
        return `Remove ${this.text}`;
      },
      closeButtonClass() {
        return this.$computedClass({
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: 0,
          },
        });
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
    height: 26px;
    min-height: 26px;
    padding: 2px 12px;
    margin: 5px;
    font-size: 13px;
    white-space: nowrap;
    user-select: none;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .content {
    display: flex;
    gap: 4px;
    align-items: center;
    height: 100%;
  }

  .text {
    display: flex;
    align-items: center;
  }

  .close-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    margin: 0;
    cursor: pointer;
    border-radius: 50%;
  }

  .close-icon {
    font-size: 18px;
  }

  .default-icon {
    top: 0;
    opacity: 1;
  }

  .hover-icon {
    position: absolute;
    top: 1px;
    opacity: 0;
  }

  .close-button:hover {
    .default-icon {
      opacity: 0;
    }

    .hover-icon {
      opacity: 1;
    }
  }

  .studio-chip.has-close-button {
    padding: 2px 6px 2px 12px;
  }

</style>
