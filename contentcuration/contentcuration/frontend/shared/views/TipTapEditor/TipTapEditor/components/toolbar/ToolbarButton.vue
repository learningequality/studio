<template>

  <button
    class="toolbar-btn"
    :title="title"
    :class="{ active: isActive, disabled: !isAvailable }"
    :disabled="!isAvailable"
    :tabindex="isAvailable ? 0 : -1"
    :aria-label="title"
    :aria-pressed="isActive ? 'true' : 'false'"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <img
      :src="currentIcon"
      :alt="title"
      class="toolbar-icon"
      :class="{ 'rtl-flip': shouldFlipInRtl && isRtl }"
    >
  </button>

</template>


<script>

  import { defineComponent, computed } from 'vue';

  export default defineComponent({
    name: 'ToolbarButton',
    setup(props, { emit }) {
      const isRtl = computed(() => {
        return document.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
      });

      // Determine which icon to use based on RTL status
      const currentIcon = computed(() => {
        if (isRtl.value && props.rtlIcon) {
          return props.rtlIcon;
        }
        return props.icon;
      });

      const handleClick = () => {
        if (props.isAvailable) {
          emit('click');
        }
      };

      const handleKeydown = event => {
        // Handle Enter and Space keys
        if ((event.key === 'Enter' || event.key === ' ') && props.isAvailable) {
          event.preventDefault();
          emit('click');
        }
      };

      return {
        handleClick,
        handleKeydown,
        isRtl,
        currentIcon,
      };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        required: true,
      },
      rtlIcon: {
        type: String,
        default: '',
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      isAvailable: {
        type: Boolean,
        default: true,
        required: false,
      },
      shouldFlipInRtl: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['click'],
  });

</script>


<style scoped>

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .toolbar-btn:hover:not(.disabled) {
    background: #e6e6e6;
  }

  .toolbar-btn:active:not(.disabled),
  .toolbar-btn.active {
    background: #d9e1fd;
  }

  .toolbar-btn.active .toolbar-icon {
    filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg)
      brightness(103%) contrast(94%);
    opacity: 1;
  }

  .toolbar-btn:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
    outline-offset: 2px;
  }

  .toolbar-icon {
    width: 19px;
    height: 19px;
    opacity: 0.7;
  }

  .toolbar-btn.disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  .toolbar-btn:disabled {
    pointer-events: none;
    cursor: not-allowed;
    opacity: 0.3;
  }

  .toolbar-icon.rtl-flip {
    transform: scaleX(-1);
  }

</style>
