<template>
  <button 
    class="toolbar-btn" 
    :title="title"
    :class="{ active: isActive }"
    @click="handleClick"
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
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const handleClick = () => {
      emit('click')
    }

    return {
      handleClick
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

.toolbar-btn:hover {
  background: #e6e6e6;
}

.toolbar-btn:active,
.toolbar-btn.active {
  background: #D9E1FD;
}

.toolbar-btn.active .toolbar-icon {
  filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg) brightness(103%) contrast(94%);
  opacity: 1;
}

.toolbar-btn:focus-visible {
  outline: 2px solid #0097F2;
  border-radius: 4px;
  background: #e6e6e6;
}

.toolbar-icon {
  width: 17px;
  height: 17px;
  opacity: 0.7;
}
</style>