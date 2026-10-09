## QTI Editor

Edits an exercise's assessment items stored as [QTI 3](https://www.imsglobal.org/spec/qti/v3p0/impl) XML in `raw_data`. Rendered by `channelEdit/components/AssessmentTab/AssessmentTab.vue`.

### Flow
1. `index.vue` lists the items; each is a `components/QTIItemEditor`.
2. `composables/useQtiItem.js` parses `raw_data` with `serialization/parseItem.js` into interaction blocks (`bodyXml` + `responseDeclarations`), hints and item metadata.
3. `components/InteractionSection` resolves each block's descriptor and question type with `composables/useInteractionDescriptor.js`.
4. The interaction's `Editor.vue` (`interactions/index.js`) edits a plain state object through `composables/useInteraction.js`: `descriptor.parse` → state → `descriptor.buildXML` → `descriptor.validate`.
5. `useQtiItem` rebuilds the full item with `serialization/assembleItem.js`; `QTIItemEditor` emits `update:rawData`.

`validateItem.js` `validateQtiItem` runs the same parse and validation headless, without the Vue editors.

### Layout
- `interactions/<type>/` — one per QTI interaction:
  - `Descriptor.js` — subclass of `InteractionDescriptor`: matches the element, picks the question type, delegates to `parse.js` and `validation.js`.
  - `parse.js` — XML ↔ state.
  - `validation.js` — state → error codes.
  - `Editor.vue` — the UI; absent for headless interactions (`HEADLESS_INTERACTIONS`).
- `interactions/descriptors.js` — descriptor registry, free of `.vue` imports. `interactions/index.js` adds the editors.
- `serialization/` — item-level parse/assemble, hints (`qti-catalog-info`), XML helpers (`xml.js`), response declarations (`qti/`).
- `components/` — shared UI: hints, chip lists, toolbars, question type selector.

### Adding an interaction
1. Create `interactions/<type>/` with `Descriptor.js`, `parse.js`, `validation.js` and `Editor.vue`.
2. Register the descriptor in `interactions/descriptors.js` and the editor in `interactions/index.js`.
3. Add its question types to `constants.js` and strings to `qtiEditorStrings.js`.

### Rich text fields
Prompts, choices, items and hints are edited in `TipTapEditor` with `format="html"`.

> [!IMPORTANT]
> In `parse`, read any field TipTap loads as HTML with `getContentHTML` (or `getPromptHTML`) from `serialization/xml.js`, never `innerHTML` or `XMLSerializer`. XML serialization self-closes empty elements (`<span data-latex="…"/>`); the HTML parser doesn't treat `/>` as closing, so everything after it is nested inside and lost.
>
> On build, pass the HTML to `buildXmlNode({ innerHTML })`, which parses it as HTML and re-creates it as XML.

> [!NOTE]
> A node view that shows itself as selected, like the inline choice chip, uses `--selection-background-color` and `--selection-color`, the colours of Studio's `::selection` (`shared/styles/vuetify.scss`), not a theme colour. KDS's global styles select with `$themeBrand.secondary.v_100`, but Studio doesn't load them as of KDS 5.9.0. When it does, point those variables at KDS's colour.
