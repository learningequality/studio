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
    <img :src="icon" :alt="title" class="toolbar-icon">
  </button>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ToolbarButton',
  props: {
    title: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: true,
      required: false
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const handleClick = () => {
      if(props.isAvailable) {
        emit('click')
      }
    }

    const handleKeydown = (event) => {
      // Handle Enter and Space keys
      if ((event.key === 'Enter' || event.key === ' ') && props.isAvailable) {
        event.preventDefault()
        emit('click')
      }
    }

    return {
      handleClick,
      handleKeydown
    }
  }
})
</script>

<style scoped>
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toolbar-btn:hover:not(.disabled) {
  background: #e6e6e6;
}

.toolbar-btn:active:not(.disabled),
.toolbar-btn.active {
  background: #D9E1FD;
}

.toolbar-btn.active .toolbar-icon {
  filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg) brightness(103%) contrast(94%);
  opacity: 1;
}

.toolbar-btn:focus-visible {
  outline: 2px solid #0097F2;
  outline-offset: 2px;
  border-radius: 4px;
  background: #e6e6e6;
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
  cursor: not-allowed;
  opacity: 0.3;
  pointer-events: none;
}
</style>