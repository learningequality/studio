import { computed, inject } from 'vue';
import { getTranslator } from '../TipTapEditorStrings';

export function useToolbarActions() {
  const editor = inject('editor', null);

  // Create the translator object
  const t = (key, args = {}) => {
    const translator = getTranslator();
    return translator.$tr(key, args);
  };

  // Action handlers
  const handleUndo = () => {
    if (editor?.value) {
      editor.value.chain().focus().undo().run();
    }
  };

  const handleRedo = () => {
    if (editor?.value) {
      editor.value.chain().focus().redo().run();
    }
  };

  const handleBold = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleBold().run();
    }
  };

  const handleItalic = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleItalic().run();
    }
  };

  const handleUnderline = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleUnderline().run();
    }
  };

  const handleStrikethrough = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleStrike().run();
    }
  };

  // Copy with formatting
  const handleCopy = () => {
    if (editor.value) {
      // Just use the browser's built-in copy command
      document.execCommand('copy');
    }
  };

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
          handlePasteNoFormat();
        }
      } catch (err) {
        editor.value
          .chain()
          .focus()
          .insertContent('Clipboard access failed. Try copying again.')
          .run();
      }
    }
  };

  const handlePasteNoFormat = async () => {
    if (editor.value) {
      try {
        // Read plain text from clipboard
        const text = await navigator.clipboard.readText();
        editor.value.chain().focus().insertContent(text).run();
      } catch (err) {
        editor.value
          .chain()
          .focus()
          .insertContent('Clipboard access failed. Try copying again.')
          .run();
      }
    }
  };

  const handleBulletList = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleBulletList().run();
    }
  };

  const handleNumberList = () => {
    if (editor?.value) {
      editor.value.chain().focus().toggleOrderedList().run();
    }
  };

  const handleSubscript = () => {
    // TipTap subscript logic will be added here
  };

  const handleSuperscript = () => {
    // TipTap superscript logic will be added here
  };

  const handleInsertImage = () => {
    // TipTap insert image logic will be added here
  };

  const handleInsertLink = () => {
    // TipTap insert link logic will be added here
  };

  const handleMath = () => {
    // TipTap math formula logic may be added here
  };

  const handleCodeBlock = () => {
    // TipTap code block logic may be added here
  };

  const handleFormatChange = format => {
    if (!editor?.value) return;

    switch (format) {
      case 'normal':
        // Clear any existing formatting and set to paragraph
        editor.value.chain().focus().clearNodes().setParagraph().run();
        break;
      case 'h1':
        editor.value.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.value.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.value.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'small':
        // Convert to paragraph first, then apply small mark
        editor.value.chain().focus().setSmall().run();
        break;
      default:
        break;
    }
  };

  // Helper function to check if a mark is active
  const isMarkActive = markName => {
    return editor?.value?.isActive(markName) || false;
  };

  // Helper function to check if a button is clickable
  const isButtonAvailable = action => {
    if (!editor?.value) return false;

    switch (action) {
      case 'undo':
        return editor.value.can().undo();
      case 'redo':
        return editor.value.can().redo();
      default:
        return true; // Default to true for other actions
    }
  };

  // Computed arrays for toolbar actions
  const historyActions = computed(() => [
    {
      name: 'undo',
      title: t('undo'),
      icon: require('../../assets/icon-undo.svg'),
      handler: handleUndo,
      isAvailable: isButtonAvailable('undo'),
    },
    {
      name: 'redo',
      title: t('redo'),
      icon: require('../../assets/icon-redo.svg'),
      handler: handleRedo,
      isAvailable: isButtonAvailable('redo'),
    },
  ]);

  const textActions = computed(() => [
    {
      name: 'bold',
      title: t('bold'),
      icon: require('../../assets/icon-bold.svg'),
      handler: handleBold,
      isActive: isMarkActive('bold'),
    },
    {
      name: 'italic',
      title: t('italic'),
      icon: require('../../assets/icon-italic.svg'),
      handler: handleItalic,
      isActive: isMarkActive('italic'),
    },
    {
      name: 'underline',
      title: t('underline'),
      icon: require('../../assets/icon-underline.svg'),
      handler: handleUnderline,
      isActive: isMarkActive('underline'),
    },
    {
      name: 'strikethrough',
      title: t('strikethrough'),
      icon: require('../../assets/icon-strikethrough.svg'),
      handler: handleStrikethrough,
      isActive: isMarkActive('strike'),
    },
  ]);

  const listActions = computed(() => [
    {
      name: 'bulletList',
      title: t('bulletList'),
      icon: require('../../assets/icon-bulletList.svg'),
      handler: handleBulletList,
      isActive: isMarkActive('bulletList'),
    },
    {
      name: 'numberList',
      title: t('numberedList'),
      icon: require('../../assets/icon-numberList.svg'),
      rtlIcon: require('../../assets/icon-numberListRTL.svg'),
      handler: handleNumberList,
      isActive: isMarkActive('orderedList'),
    },
  ]);

  const scriptActions = computed(() => [
    {
      name: 'subscript',
      title: t('subscript'),
      icon: require('../../assets/icon-subscript.svg'),
      handler: handleSubscript,
    },
    {
      name: 'superscript',
      title: t('superscript'),
      icon: require('../../assets/icon-superscript.svg'),
      handler: handleSuperscript,
    },
  ]);

  const insertTools = computed(() => [
    {
      name: 'image',
      title: t('insertImage'),
      icon: require('../../assets/icon-insertImage.svg'),
      handler: handleInsertImage,
    },
    {
      name: 'link',
      title: t('insertLink'),
      icon: require('../../assets/icon-link.svg'),
      handler: handleInsertLink,
    },
    {
      name: 'math',
      title: t('mathFormula'),
      icon: require('../../assets/icon-formula.svg'),
      handler: handleMath,
    },
    {
      name: 'code',
      title: t('codeBlock'),
      icon: require('../../assets/icon-codeblock.svg'),
      handler: handleCodeBlock,
    },
  ]);

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
    handleFormatChange,

    // Action arrays
    historyActions,
    textActions,
    listActions,
    scriptActions,
    insertTools,

    // translator function
    t,
  };
}
