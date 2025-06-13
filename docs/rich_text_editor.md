# Rich Text Editor Documentation

This Component replaces Studio’s text editor with a future-ready implementation, deliberately scoped to immediate needs:
-​ Swap Toast UI while preserving Markdown storage
-​ Support for core formatting 
-​ Support for more advanced formats (code and math blocks, image uploading)

It uses TipTap which is a headless, framework-agnostic rich-text editor built on top of ProseMirror.
[https://tiptap.dev/docs](https://tiptap.dev/docs)

## Current Folder Structure

```
TipTapEditor/
├── assets/
│   └── # icons
└── TipTapEditor/
|   ├── components/
|   │   ├── toolbar/
|	│       ├── ToolbarButton.vue
|	│       ├── FormatDropdown.vue
|	│       ├── PasteDropdown.vue
|	│       └── ToolbarDivider.vue
|   │   ├── EditorToolbar.vue
|   |   └── EditorContentWrapper.vue
|   ├── composables/
|   │   ├── useDropdowns.js
|   │   ├── useEditor.js
|   │   └── useToolbarActions.js
|   ├── extensions/
|   │   ├── SmallTextExtension.js
|   └── TipTapEditor.vue                # Main container    
└── TipTapEditorStrings.js
```
## Current Key Features

- **Rich Text Formatting**: Bold, italic, underline, strikethrough
- **Typography**: Multiple heading levels (H1, H2, H3), normal text, and small text
- **Lists**: Bullet lists and numbered lists
- **Advanced Clipboard**: Copy with formatting, paste with/without formatting
- **History**: Undo/redo functionality
- **Accessibility**: Full keyboard navigation and ARIA support
- **RTL Support**: Right-to-left text direction support
- **Internationalization**: Built-in string management system
- **Custom Extensions**: Extensible architecture for additional features

## Core Components

### 1. TipTapEditor.vue

**Main container component that orchestrates the entire editor**

- **Purpose**: Acts as the root component that provides editor context to all child components
- **Key Features**:
    - Uses composition API with `useEditor` composable
    - Provides editor instance and ready state to child components via Vue's provide/inject
    - Contains global typography styles for the editor content
- **Dependencies**:
    - `EditorToolbar.vue`
    - `EditorContentWrapper.vue`
    - `useEditor` composable

```vue
// Example usage
<TipTapEditor />
```

### 2. EditorToolbar.vue

**Main toolbar component containing all editing controls**

- **Purpose**: Renders the complete toolbar with all formatting options
- **Structure**: Organized into logical groups with dividers:
    - History actions (undo/redo)
    - Format dropdown
    - Text formatting (bold, italic, underline, strikethrough)
    - Copy/paste controls
    - List formatting
    - Script formatting (subscript, superscript)
    - Insert tools (image, link, math, code)
- **Accessibility**: Full ARIA support with role groups and labels
- **Dependencies**: Uses `useToolbarActions` composable for all action handlers

### 3. EditorContentWrapper.vue

**Wrapper for the actual editor content area**

- **Purpose**: Provides the editable content area with proper styling
- **Features**:
    - Proper padding and spacing
    - Typography styles for all content types
    - RTL text direction support
- **Styling**: Deep selectors for ProseMirror content styling

## Toolbar Components

### 4. ToolbarButton.vue

**Reusable button component for toolbar actions**

- **Props**:
    - `title`: Button tooltip and accessibility label
    - `icon`: Path to button icon
    - `rtlIcon`: Optional RTL-specific icon
    - `isActive`: Boolean indicating if button is in active state
    - `isAvailable`: Boolean controlling button availability
    - `shouldFlipInRtl`: Boolean for RTL icon flipping
- **Features**:
    - Automatic RTL icon switching
    - Disabled state handling
    - Keyboard navigation (Enter/Space)
    - Focus management with outline styles
    - Active state styling

### 5. FormatDropdown.vue

**Dropdown for text format selection (Normal, Small, H1, H2, H3)**

- **Features**:
    - Dynamic format detection and display
    - Live preview of formats in dropdown
    - Full keyboard navigation (arrows, Enter, Escape, Home, End)
    - Focus management
    - ARIA menu implementation
- **Format Options**:
    - Small text (12px)
    - Normal paragraph (16px)
    - Header 3 (18px)
    - Header 2 (24px)
    - Header 1 (32px)

### 6. PasteDropdown.vue

**Split button for paste operations**

- **Structure**:
    - Main paste button (standard paste with formatting)
    - Dropdown arrow for paste options
- **Options**:
    - Paste (with formatting)
    - Paste without formatting (plain text)
- **Features**:
    - Clipboard API integration
    - HTML and plain text handling
    - Keyboard navigation
    - Split button interaction pattern

### 7. ToolbarDivider.vue

**Visual separator between toolbar groups**

- Simple component providing consistent spacing and visual separation
- Helps organize toolbar into logical sections

## Composables (Business Logic)

### 8. useEditor.js

**Core editor initialization and lifecycle management**

- **Purpose**: Creates and manages the TipTap editor instance
- **Extensions Used**:
    - StarterKit (basic functionality)
    - Underline extension
    - Custom Small text extension
- **Lifecycle**: Handles editor creation on mount and cleanup on unmount
- **Returns**: Editor instance and ready state

```javascript
const { editor, isReady } = useEditor()
```

### 9. useToolbarActions.js

**All toolbar action handlers and state management**

- **Individual Handlers**: Each formatting action (bold, italic, etc.)
- **Action Groups**: Organized arrays of related actions
- **Features**:
    - Copy with HTML and plain text formats
    - Intelligent paste handling
    - Active state detection for buttons
    - Button availability checking (undo/redo)
    - Format application logic
- **Internationalization**: Uses translator function for button labels

### 10. useDropdowns.js

**Dropdown state management and interaction logic**

- **State Management**:
    - Current format detection
    - Dropdown open/close states
    - Format options configuration
- **Format Detection**: Real-time monitoring of cursor position to update selected format
- **Event Handling**: Click outside detection for dropdown closing
- **Editor Integration**: Listens to editor transactions for format updates

## Extensions

### 11. SmallTextExtension.js

**Custom TipTap extension for small text formatting**

- **Type**: Block node extension
- **Features**:
    - Creates `<small>` HTML elements
    - Block-level content with inline children
    - Custom CSS class (`small-text`)
    - Keyboard shortcut (Mod+Shift+S)
- **Commands**:
    - `setSmall()`: Convert current block to small text
    - `toggleSmall()`: Toggle between small text and paragraph
    - `unsetSmall()`: Convert back to paragraph
- **Priority**: High priority (1000) for proper node precedence

>[!NOTE]
> Why a Node instead of a Mark?
> - Semantic structure: `<small> `is semantically a block-level structure in our context, representing a complete unit of small text rather than just formatted text spans.
> - Content integrity: As a Node, we can ensure the entire content maintains consistent styling and behavior.
> - Block-level control: Using a Node allows us to treat small text as a distinct content block that can be manipulated as a whole unit in the editor.
> - DOM structure: We want a proper `<small>` element in the output HTML rather than just applying a class or style to spans of text.


### 12. TipTapEditorStrings.js

**Centralized string management for internationalization**

- **Structure**:
    - Namespace-based organization
    - Message key-value pairs
    - Translator factory function
- **Coverage**: All user-facing strings including:
    - Button labels and tooltips
    - Format options
    - Accessibility labels
    - Dropdown options
- **Usage**: Provides `getTranslator()` function for components

>[!NOTE]
>Uses Lazy Loading pattern to be able to use it without the need for it to be inside a vue lie cycle hook.
## Styling Architecture

asheres to [the suggested figma design](https://www.figma.com/design/uw8lx88ZKZU8X7kN9SdLeo/Rich-text-editor---GSOC-2025?node-id=377-633&t=0XAXleYjjGY2Fxzc-0)
### Component Styles

- Scoped styles for component isolation
- Deep selectors for ProseMirror content
- CSS custom properties for theming
- Focus management with outline styles

### Accessibility Features

- High contrast focus indicators
- ARIA roles and properties
- Keyboard navigation support
- Screen reader friendly labels

## Technical Specifications

### Dependencies

- **TipTap**: Core editor framework
- **TipTap Extensions**: StarterKit, Underline
- **Clipboard API**: Modern clipboard operations

### Browser Support

- Modern browsers with Clipboard API support
- RTL text direction support
- Keyboard navigation compatibility