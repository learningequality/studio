<template>
  <div class="editor-container">
    <!-- Toolbar -->
    <div class="toolbar">
      <!-- History buttons -->
      <div class="toolbar-group">
        <button 
          class="toolbar-btn" 
          title="Undo"
          @click="handleUndo"
        >
          <img :src="require('../assets/icon-undo.svg')" alt="Undo" class="toolbar-icon">
        </button>
        <button 
          class="toolbar-btn" 
          title="Redo"
          @click="handleRedo"
        >
          <img :src="require('../assets/icon-redo.svg')" alt="Redo" class="toolbar-icon">
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Format dropdown -->
      <div class="toolbar-group dropdown-container">
        <button 
          class="format-dropdown" 
          @click="toggleHeadersDropdown"
        >
          <span>{{ selectedFormat }}</span>
          <img :src="require('../assets/icon-chevron-down.svg')" alt="" class="dropdown-icon">
        </button>
        <div 
          v-if="showHeadersDropdown" 
          class="dropdown-menu headers-dropdown"
        >
          <div 
            v-for="format in formatOptions" 
            :key="format.value"
            class="dropdown-item" 
            @click="selectFormat(format)"
          >
            <component :is="format.tag" v-text="format.label" />
          </div>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Text formatting -->
      <div class="toolbar-group">
        <button 
          v-for="action in textActions" 
          :key="action.name"
          class="toolbar-btn" 
          :title="action.title"
          @click="action.handler"
        >
          <img :src="action.icon" :alt="action.title" class="toolbar-icon">
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Copy/Paste -->
      <div class="toolbar-group">
        <button 
          class="toolbar-btn" 
          title="Copy"
          @click="handleCopy"
        >
          <img :src="require('../assets/icon-copy.svg')" alt="Copy" class="toolbar-icon">
        </button>
        
        <div class="paste-button-container dropdown-container">
          <button 
            class="toolbar-btn paste-main-btn" 
            @click="handlePaste" 
            title="Paste"
          >
            <img :src="require('../assets/icon-paste.svg')" alt="Paste" class="toolbar-icon">
          </button>
          <button 
            class="paste-dropdown-btn" 
            @click="togglePasteDropdown" 
            title="Paste Options"
          >
            <img :src="require('../assets/icon-chevron-down.svg')" alt="" class="dropdown-arrow">
          </button>
          <div 
            v-if="showPasteDropdown" 
            class="dropdown-menu paste-dropdown"
          >
            <div 
              v-for="option in pasteOptions" 
              :key="option.name"
              class="dropdown-item"
              @click="option.handler"
            >
              <img :src="option.icon" :alt="option.title" class="dropdown-item-icon">
              <span>{{ option.title }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Lists -->
      <div class="toolbar-group">
        <button 
          v-for="list in listActions" 
          :key="list.name"
          class="toolbar-btn" 
          :title="list.title"
          @click="list.handler"
        >
          <img :src="list.icon" :alt="list.title" class="toolbar-icon">
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Script formatting -->
      <div class="toolbar-group">
        <button 
          v-for="script in scriptActions" 
          :key="script.name"
          class="toolbar-btn" 
          :title="script.title"
          @click="script.handler"
        >
          <img :src="script.icon" :alt="script.title" class="toolbar-icon">
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Insert tools -->
      <div class="toolbar-group">
        <button 
          v-for="tool in insertTools" 
          :key="tool.name"
          class="toolbar-btn" 
          :title="tool.title"
          @click="tool.handler"
        >
          <img :src="tool.icon" :alt="tool.title" class="toolbar-icon">
        </button>
      </div>
    </div>

    <!-- Editor Content Area -->
    <div class="editor-content">
      <div class="editor-placeholder">
        Will render TipTap's editor here...
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'

export default defineComponent({
  name: 'RichTextEditor',
  
  setup() {
    const selectedFormat = ref('Normal')
    const showHeadersDropdown = ref(false)
    const showPasteDropdown = ref(false)

    const formatOptions = computed(() => [
      { value: 'small', label: 'small', tag: 'small' },
      { value: 'normal', label: 'Normal', tag: 'p' },
      { value: 'h3', label: 'Header 3', tag: 'h3' },
      { value: 'h2', label: 'Header 2', tag: 'h2' },
      { value: 'h1', label: 'Header 1', tag: 'h1' }
    ])

    // Action handlers
    const handleUndo = () => {
      // TipTap undo logic will be added here
    }

    const handleRedo = () => {
      // TipTap redo logic will be added here
    }

    const handleBold = () => {
      // TipTap bold logic will be added here
    }

    const handleItalic = () => {
      // TipTap italic logic will be added here
    }

    const handleUnderline = () => {
      // TipTap underline logic will be added here
    }

    const handleStrikethrough = () => {
      // TipTap strikethrough logic will be added here
    }

    const handleCopy = () => {
      // TipTap copy logic will be added here
    }

    const handlePaste = () => {
      // TipTap paste logic will be added here
    }

    const handlePasteNoFormat = () => {
      // TipTap paste without formatting logic will be added here
    }

    const handleBulletList = () => {
      // TipTap bullet list logic will be added here
    }

    const handleNumberList = () => {
      // TipTap numbered list logic will be added here
    }

    const handleSubscript = () => {
      // TipTap subscript logic will be added here
    }

    const handleSuperscript = () => {
      // TipTap superscript logic will be added here
    }

    const handleInsertImage = () => {
      // TipTap insert image logic will be added here
    }

    const handleInsertLink = () => {
      // TipTap insert link logic will be added here
    }

    const handleMath = () => {
      // TipTap math formula logic May be added here
    }

    const handleCodeBlock = () => {
      // TipTap code block logic May be added here
    }

    const textActions = computed(() => [
      { name: 'bold', title: 'Bold', icon: require('../assets/icon-bold.svg'), handler: handleBold },
      { name: 'italic', title: 'Italic', icon: require('../assets/icon-italic.svg'), handler: handleItalic },
      { name: 'underline', title: 'Underline', icon: require('../assets/icon-underline.svg'), handler: handleUnderline },
      { name: 'strikethrough', title: 'Strikethrough', icon: require('../assets/icon-strikethrough.svg'), handler: handleStrikethrough }
    ])

    const pasteOptions = computed(() => [
      { name: 'paste', title: 'Paste', icon: require('../assets/icon-paste.svg'), handler: handlePaste },
      { name: 'pasteNoFormat', title: 'Paste without formatting', icon: require('../assets/icon-pasteNoFormat.svg'), handler: handlePasteNoFormat }
    ])

    const listActions = computed(() => [
      { name: 'bulletList', title: 'Bullet List', icon: require('../assets/icon-bulletList.svg'), handler: handleBulletList },
      { name: 'numberList', title: 'Numbered List', icon: require('../assets/icon-numberList.svg'), handler: handleNumberList }
    ])

    const scriptActions = computed(() => [
      { name: 'subscript', title: 'Subscript', icon: require('../assets/icon-subscript.svg'), handler: handleSubscript },
      { name: 'superscript', title: 'Superscript', icon: require('../assets/icon-superscript.svg'), handler: handleSuperscript }
    ])

    const insertTools = computed(() => [
      { name: 'image', title: 'Insert Image', icon: require('../assets/icon-insertImage.svg'), handler: handleInsertImage },
      { name: 'link', title: 'Insert Link', icon: require('../assets/icon-link.svg'), handler: handleInsertLink },
      { name: 'math', title: 'Math', icon: require('../assets/icon-formula.svg'), handler: handleMath },
      { name: 'code', title: 'Code Block', icon: require('../assets/icon-codeblock.svg'), handler: handleCodeBlock }
    ])

    // Dropdown management
    const toggleHeadersDropdown = () => {
      showHeadersDropdown.value = !showHeadersDropdown.value
      showPasteDropdown.value = false
    }

    const togglePasteDropdown = () => {
      showPasteDropdown.value = !showPasteDropdown.value
      showHeadersDropdown.value = false
    }

    const closeAllDropdowns = () => {
      showHeadersDropdown.value = false
      showPasteDropdown.value = false
    }

    const handleClickOutside = (event) => {
      // This will be properly handled when the component is mounted
    }

    const selectFormat = (format) => {
      selectedFormat.value = format.label
      closeAllDropdowns()
      // TipTap formatting logic will be added here
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      // State
      selectedFormat,
      showHeadersDropdown,
      showPasteDropdown,

      // Computed
      formatOptions,
      textActions,
      pasteOptions,
      listActions,
      scriptActions,
      insertTools,

      // Methods
      handleUndo,
      handleRedo,
      handleBold,
      handleItalic,
      handleUnderline,
      handleStrikethrough,
      handleCopy,
      handlePaste,
      handlePasteNoFormat,
      handleBulletList,
      handleNumberList,
      handleSubscript,
      handleSuperscript,
      handleInsertImage,
      handleInsertLink,
      handleMath,
      handleCodeBlock,
      toggleHeadersDropdown,
      togglePasteDropdown,
      closeAllDropdowns,
      selectFormat
    }
  }
})
</script>

<style scoped>
/* Import Google Fonts, I know I will have to remove this (offline platform) */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400&display=swap');

.editor-container {
  width: 1000px;
  margin: auto;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

/* Toolbar Styles */
.toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  position: relative;
}

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
  background: #dee2e6;
}

.toolbar-icon {
  width: 17px;
  height: 17px;
  opacity: 0.7;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #dee2e6;
  margin: 0 4px;
}

/* Dropdown Styles */
.dropdown-container {
  position: relative;
}

.format-dropdown {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 8px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  border-radius: 4px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.format-dropdown:hover {
  background: #e6e6e6;
}

.dropdown-icon {
  width: 12px;
  height: 12px;
  opacity: 0.5;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  margin-top: 4px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 140%;
  color: #000000;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

/* Paste Button Styles */
.paste-button-container {
  display: flex;
  position: relative;
  border-radius: 4px;
  overflow: visible;
}

.paste-main-btn {
  border-radius: 4px 0 0 4px !important;
  width: 28px !important;
}

.paste-dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-left: 1px solid #dee2e6;
}

.paste-dropdown-btn:hover {
  background: #e6e6e6;
}

.paste-dropdown-btn:active {
  background: #dee2e6;
}

.dropdown-arrow {
  width: 8px;
  height: 8px;
  opacity: 0.5;
}

.paste-dropdown {
  right: -12px;
  min-width: 250px;
}

/* Editor Content */
.editor-content {
  min-height: 200px;
  padding: 16px;
}

.editor-placeholder {
  color: #6c757d;
  font-size: 14px;
}

/* Typography Styles */
:deep(h1) {
  font-size: 32px;
  font-weight: 600;
  margin: 24px 0 16px;
}

:deep(h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 8px 0;
}

:deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0;
}

:deep(p) {
  font-size: 16px;
  margin: 8px 0;
}

:deep(small) {
  font-size: 12px;
  margin: 4px 0;
}
</style>