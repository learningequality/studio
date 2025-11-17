<template>

  <div
    class="studio-chip"
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
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_300,
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
    padding: 2px 8px;
    margin: 5px;
    font-size: 13px;
    white-space: nowrap;
    user-select: none;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .content {
    display: flex;
    gap: 4px; /* Reduced gap to remove extra space */
    align-items: center;
    height: 100%;
  }

  .text {
    display: flex;
    align-items: center;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    min-height: 16px;
    padding: 0;
    margin: 0;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }
  }

</style>
