## Rich Text Editor Documentation

Studio has a Rich text Editor that is currently being used in the exercise editor: (questions / answers / hints)

We use [TipTap](https://tiptap.dev/) that is a headless framework based on ProseMirror. It was built to replace a past long-lived Toast UI (TUI) based editor; that influenced some implementation decisions to maintain backward compatibility.

Currently editor code lives in: https://github.com/learningequality/studio/tree/unstable/contentcuration/contentcuration/frontend/shared/views/TipTapEditor

Another point that had an impact on our architectural decisions is that there are future plans to extract the editor to be part of Kolibri-Design-System to be used in Kolibri too. That meant we had to keep the editor as decoupled from the rest of the codebase as much as possible.

## Useful Links
- Original figma design [link](https://www.figma.com/design/uw8lx88ZKZU8X7kN9SdLeo/Rich-text-editor---GSOC-2025?node-id=377-422&p=f&t=HIkJ8pF9xudcOnLd-0)
- Original Tracking issue for creating the editor [link](https://github.com/learningequality/studio/issues/5049)
- Tiptap basic editor [docs](https://tiptap.dev/docs/editor/getting-started/overview)
---
## Custom extensions
For non-text elements, we create [custom extensions optionally with their node views](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue).
We currently have custom extensions for:
- images
- formulas
- syntax highlighted code blocks
- links
- `<small />` text nodes

### How to add a custom plugin?
This is a very high level guide, you'll still need to check the docs but make sure you check all the boxes in this list:
1. Create a new file in
    `TipTapEditor/extensions/`
2. Define your node or mark using TipTap’s `Node.create()` or `Mark.create()`.
3. Register it:
    - for every editor: add it to the editor’s extension list in `TipTapEditor/composables/useEditor.js`.
    - for one consumer only: pass it in the `extensions` prop (see [Extending the editor from a consumer](#extending-the-editor-from-a-consumer)).
4. If your node needs Markdown support, update the custom serializer in `TipTapEditor/utils/MarkdownSerializer.js` and don't forget to update the tests accordingly!
---
## Extending the editor from a consumer
A component that renders `TipTapEditor` can add behaviour without editing the editor's code.

### `extensions` prop
- tiptap extensions, registered after the built-ins.
- Read once, when the editor is created; later changes are ignored.

### `@ready` event
- Emitted once, with the tiptap `Editor`, after its `create` event; commands are safe from then on.
- Subscribe with `editor.on(…)`; unsubscribe with `editor.off(…)` on unmount.

### `insertActions` prop
Descriptors for buttons in the insert group. They appear on all three toolbars (desktop, `MobileTopBar` menu, `MobileFormattingBar`).

| Field | Meaning |
|---|---|
| `name` | Unique among insert tools. Not `image`, `link`, `math` or `code`: those are built-ins, and `EditorToolbar` routes the first three by name. |
| `title` | Label and accessible name; translated by the consumer. |
| `icon`, `rtlIcon`, `shouldFlipInRtl` | As for built-in tools. |
| `handler(context)` | Runs on click, with the context below. Not called while unavailable. |
| `isActive`, `isAvailable` | Boolean, or `context => boolean`. Unavailable controls stay focusable with `aria-disabled`. |
| `prominent` | Desktop only: shown with its title, just before minimize, never moved into More. Mobile toolbars ignore it. |

The context is re-evaluated on every transaction; no listener is needed. The editor supplies facts; the consumer decides what they mean.

| Field | Meaning |
|---|---|
| `editor` | The tiptap `Editor`. |
| `selection.empty` | The selection is a cursor. |
| `selection.spansLines` | Replacing the selection would delete a line break (it crosses blocks or contains a hard break). |
| `selection.hasCursor` | The author has focused the editor at least once. Stays `true` after blur, e.g. when a toolbar menu takes focus. |
| `canInsertNode(typeName)` | A node of that type can be inserted at the selection; `false` for an unknown type. |

```js
{
  name: 'widget',
  title: insertWidget$(),
  icon: require('./icon-widget.svg'),
  prominent: true,
  // Replacing a multi-line selection with an inline node joins the lines.
  isAvailable: ({ selection, canInsertNode }) =>
    !selection.spansLines && canInsertNode('widget'),
  handler: ({ editor, selection }) =>
    (selection.hasCursor ? editor.chain().focus() : editor.chain().focus('end'))
      .insertWidget()
      .run(),
}
```

### Paste handling
- Use an extension's `transformPasted`: it runs after parsing and receives a `Slice`.
- An extension's `transformPastedHTML` runs after the editor's own (`useEditor.js` `editorProps`), on HTML `utils/pasteTransform.js` has already cleaned: `<img>` and Office `w:`/`m:`/`o:`/`v:` tags are gone.

### Node views reading consumer state
- ProseMirror mounts node views outside the Vue render tree: no slots, no `$emit` listener.
- tiptap mounts them with `parent: editor.contentComponent`, so `inject` reaches whatever an ancestor of `TipTapEditor` provides.
- Example: the consumer calls `provide('selectedWidgetId', selectedWidgetId)`; the node view calls `inject('selectedWidgetId')` and computes `selectedWidgetId.value === props.node.attrs.id`.
---
## Content Conversion Flow
The old content API saved markdown in the database, the following data conversion flow maintains backward compatibility by implementing dual conversion between the strcutured JSON format TipTap uses and markdown.

We support the conversion for:
- Standard Markdown elements previously handled by the ToastUI editor and its Showdown converter.
- A specific, legacy format for custom nodes, particularly for Images `(![alt](placeholder/checksum.ext =WxH))` and Math Formulas `$$latex$$`

The formats for the custom nodes are adapted from the old editor's standard syntax conversion.
We have our own custom markdown serializer for that too! The following graph illustrates the whole flow.
<img width="900" height="900" alt="image" src="https://github.com/user-attachments/assets/c994951d-1ca0-47fd-b342-e8bbf76caf1a" />

---
## Mobile View
As per the figma design, the mobile view is different from the desktop design to a point where it can't just be fixed with just CSS tweaks or media queries. We did some thinking&research and decided to take a Conditional Toolbar Layout approach where We've created different components for different screen sizes.

That means, if you add a new button in the desktop's toolbar, you'll have to add it to the Mobile's toolbar component too, and make sure you keep the functionality extracted in a reusable way so you only repeat the template logic and not the whole javascript!

As per the Figma design, the **mobile view** differs significantly from the desktop layout — more than what simple CSS tweaks or media queries can handle.

We decided to take a **Conditional Toolbar Layout** approach:
- Different toolbar components are used for desktop and mobile.
- The logic (commands, editor state, etc.) is shared and reusable.
- Only the **template structure** differs.

>[!TIP]
>That means:
> If you add a new button to the desktop toolbar, you’ll also need to add it to the mobile toolbar component.
> Keep the functionality extracted and reusable, so you only duplicate the **template**, not the **JavaScript logic**.

Contributed `insertActions` reach all three toolbars without template changes; the tip above applies to built-in buttons.
