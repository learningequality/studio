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
        <HoverIcon
          outlineIcon="delete"
          filledIcon="delete"
          :outlineColor="$themePalette.grey.v_400"
          :filledColor="$themePalette.grey.v_900"
          class="close-icon"
        />
      </button>
    </div>
  </div>

</template>


<script>

  import HoverIcon from './HoverIcon.vue';

  export default {
    name: 'StudioChip',
    components: {
      HoverIcon,
    },
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
    justify-content: center;
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
    cursor: pointer;
    border-radius: 50%;
  }

  .studio-chip.has-close-button {
    padding: 3px 6px 2px 12px;
  }

  .close-icon {
    width: 24px;
    height: 24px;
    font-size: 18px;
  }

</style>
