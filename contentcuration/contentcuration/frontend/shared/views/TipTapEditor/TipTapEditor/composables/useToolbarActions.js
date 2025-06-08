import { ContentKindLearningActivityDefaults } from 'shared/leUtils/ContentKinds'
import { computed, inject } from 'vue'

export function useToolbarActions() {
  // Get editor instance from provide/inject
  const editor = inject('editor', null)

  // Action handlers
  const handleUndo = () => {
    if (editor?.value) {
      editor.value.chain().focus().undo().run()
    }
  }

  const handleRedo = () => {
    if (editor?.value) {
      editor.value.chain().focus().redo().run()
    }
  }

  const handleBold = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleBold().run()
    }
  }

  const handleItalic = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleItalic().run()
    }
  }

  const handleUnderline = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleUnderline().run()
    }
  }

  const handleStrikethrough = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleStrike().run()
    }
  }

  // Copy with formatting
  const handleCopy = () => {
    if (editor.value) {
      const { from, to } = editor.value.state.selection;
      const selectedContent = editor.value.state.doc.slice(from, to);
      
      // Get HTML
      const html = editor.value.getHTML();
      const text = editor.value.getText();
      
      // Copy both HTML and plain text
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
    }
  }

  const handlePaste = async () => {
  if (editor.value) {
    try {
      // Try HTML first
      const clipboardData = await navigator.clipboard.read();
      const htmlType = clipboardData[0].types.find(type => type === 'text/html');
      
      if (htmlType) {
        const htmlBlob = await clipboardData[0].getType('text/html');
        const html = await htmlBlob.text();
        editor.value.chain().focus().insertContent(html).run();
      } else {
        // Fall back to plain text
        const text = await navigator.clipboard.readText();
        editor.value.chain().focus().insertContent(text).run();
      }
    } catch (err) {
      console.error('Paste failed:', err);
    }
  }
}

  const handlePasteNoFormat = async () => {
    if (editor.value) {
      try {
        // Read plain text from clipboard
        const text = await navigator.clipboard.readText();
        editor.value.chain().focus().insertContent(text).run();
      } catch (err) {
        console.error('Paste without format failed:', err);
      }
    }
  }

  const handleBulletList = () => {
    // TipTap bullet list logic will be added here
    console.log('Bullet list action')
  }

  const handleNumberList = () => {
    // TipTap numbered list logic will be added here
    console.log('Number list action')
  }

  const handleSubscript = () => {
    // TipTap subscript logic will be added here
    console.log('Subscript action')
  }

  const handleSuperscript = () => {
    // TipTap superscript logic will be added here
    console.log('Superscript action')
  }

  const handleInsertImage = () => {
    // TipTap insert image logic will be added here
    console.log('Insert image action')
  }

  const handleInsertLink = () => {
    // TipTap insert link logic will be added here
    console.log('Insert link action')
  }

  const handleMath = () => {
    // TipTap math formula logic may be added here
    console.log('Math action')
  }

  const handleCodeBlock = () => {
    // TipTap code block logic may be added here
    console.log('Code block action')
  }

  // Helper function to check if a mark is active
  const isMarkActive = (markName) => {
    return editor?.value?.isActive(markName) || false
  }

  // Computed arrays for toolbar actions
  const textActions = computed(() => [
    { 
      name: 'bold', 
      title: 'Bold', 
      icon: require('../../assets/icon-bold.svg'), 
      handler: handleBold,
      isActive: isMarkActive('bold')
    },
    { 
      name: 'italic', 
      title: 'Italic', 
      icon: require('../../assets/icon-italic.svg'), 
      handler: handleItalic,
      isActive: isMarkActive('italic')
    },
    { 
      name: 'underline', 
      title: 'Underline', 
      icon: require('../../assets/icon-underline.svg'), 
      handler: handleUnderline,
      isActive: isMarkActive('underline')
    },
    { 
      name: 'strikethrough', 
      title: 'Strikethrough', 
      icon: require('../../assets/icon-strikethrough.svg'), 
      handler: handleStrikethrough,
      isActive: isMarkActive('strike')
    }
  ])

  const listActions = computed(() => [
    { 
      name: 'bulletList', 
      title: 'Bullet List', 
      icon: require('../../assets/icon-bulletList.svg'), 
      handler: handleBulletList 
    },
    { 
      name: 'numberList', 
      title: 'Numbered List', 
      icon: require('../../assets/icon-numberList.svg'), 
      handler: handleNumberList 
    }
  ])

  const scriptActions = computed(() => [
    { 
      name: 'subscript', 
      title: 'Subscript', 
      icon: require('../../assets/icon-subscript.svg'), 
      handler: handleSubscript 
    },
    { 
      name: 'superscript', 
      title: 'Superscript', 
      icon: require('../../assets/icon-superscript.svg'), 
      handler: handleSuperscript 
    }
  ])

  const insertTools = computed(() => [
    { 
      name: 'image', 
      title: 'Insert Image', 
      icon: require('../../assets/icon-insertImage.svg'), 
      handler: handleInsertImage 
    },
    { 
      name: 'link', 
      title: 'Insert Link', 
      icon: require('../../assets/icon-link.svg'), 
      handler: handleInsertLink 
    },
    { 
      name: 'math', 
      title: 'Math', 
      icon: require('../../assets/icon-formula.svg'), 
      handler: handleMath 
    },
    { 
      name: 'code', 
      title: 'Code Block', 
      icon: require('../../assets/icon-codeblock.svg'), 
      handler: handleCodeBlock 
    }
  ])

  return {
    // Individual handlers
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

    // Action arrays
    textActions,
    listActions,
    scriptActions,
    insertTools
  }
}