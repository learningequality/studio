import { ref, onMounted, onUnmounted, inject, watch } from 'vue'

export function useDropdowns() {
  const selectedFormat = ref('Normal')
  const showHeadersDropdown = ref(false)
  const showPasteDropdown = ref(false)
  const editor = inject('editor', null)

  // Format detection function
  const updateSelectedFormat = () => {
    if (!editor?.value) return

    // Check current active format at cursor position
    if (editor.value.isActive('heading', { level: 1 })) {
      selectedFormat.value = 'Header 1'
    } else if (editor.value.isActive('heading', { level: 2 })) {
      selectedFormat.value = 'Header 2'
    } else if (editor.value.isActive('heading', { level: 3 })) {
      selectedFormat.value = 'Header 3'
    } else if (editor.value.isActive('small')) {
      selectedFormat.value = 'small'
    } else {
      selectedFormat.value = 'Normal'
    }
  }

  watch(
    () => editor?.value?.state.selection,
    () => {
      if (editor?.value) {
        updateSelectedFormat()
      }
    },
    { deep: true }
  )

  let offTransaction = null

  const setupEditorListener = () => {
    if (editor?.value) {
      const handler = () => updateSelectedFormat()
      editor.value.on('transaction', handler)
      offTransaction = () => editor.value.off('transaction', handler)
    }
  }

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

  const selectFormat = (format) => {
    selectedFormat.value = format.label
    closeAllDropdowns()
    console.log('Format selected:', format)    
  }

  const handleClickOutside = (event) => {
    const dropdownContainers = document.querySelectorAll('.dropdown-container')
    let isOutside = true
    
    dropdownContainers.forEach(container => {
      if (container.contains(event.target)) {
        isOutside = false
      }
    })
    
    if (isOutside) {
      closeAllDropdowns()
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    // Setup editor listener when component mounts
    setupEditorListener()
    // Initial format detection
    updateSelectedFormat()
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    if (offTransaction) offTransaction()
  })

  return {
    selectedFormat,
    showHeadersDropdown,
    showPasteDropdown,
    toggleHeadersDropdown,
    togglePasteDropdown,
    closeAllDropdowns,
    selectFormat,
    updateSelectedFormat
  }
}