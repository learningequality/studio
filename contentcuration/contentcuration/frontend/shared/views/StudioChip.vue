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

      <KIconButton
        v-if="close"
        class="close-button"
        :aria-label="removeLabel"
        icon="delete"
        :color="$themePalette.grey.v_400"
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
    margin: 2px;
    font-size: 13px;
    white-space: nowrap;
    cursor: default;
    user-select: none;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .content {
    display: flex;
    gap: 6px;
    align-items: center;
    height: 100%;
  }

  .text {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
  }

  .close-button {
    width: 16px;
    height: 16px;
    min-height: 16px;
    padding: 0;
    margin-top: 2px;
  }

</style>
