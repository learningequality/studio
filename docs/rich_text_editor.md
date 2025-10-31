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
3. Add the new extension to the editor’s extension list in `TipTapEditor/composables/useEditor.js`.
4. If your node needs Markdown support, update the custom serializer in `TipTapEditor/utils/MarkdownSerializer.js` and don't forget to update the tests accordingly!
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
