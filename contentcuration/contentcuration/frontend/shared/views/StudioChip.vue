<template>

  <div
    ref="chip"
    class="studio-chip"
    :class="{
      'studio-chip--small': small,
      'studio-chip--clickable': close || $listeners.click,
      'studio-chip--active': isActive,
    }"
    :style="chipStyles"
    @click="handleClick"
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
    mounted() {
      document.addEventListener('click', this.handleClickOutside);
    },
    beforeDestroy() {
      document.removeEventListener('click', this.handleClickOutside);
    },
    methods: {
      handleClick(event) {
        event.stopPropagation();
        this.isActive = true;
        this.$emit('click', event);
      },
      handleClickOutside(event) {
        if (this.$refs.chip && !this.$refs.chip.contains(event.target)) {
          this.isActive = false;
        }
      },
      handleClose() {
        this.$emit('close');
        this.$emit('input');
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
