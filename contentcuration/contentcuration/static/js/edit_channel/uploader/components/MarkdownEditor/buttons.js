export const ImageUploadBtn = context => {
  return $.summernote.ui
    .button({
      contents: '<i class="note-icon-picture"/>',
      tooltip: 'Image',
      click: context.options.callbacks.onImageUpload,
    })
    .render();
};

export const FormulaBtn = context => {
  return $.summernote.ui
    .button({
      contents: '<b class="formula_icon">∑</b> <span class="caret"></span>',
      tooltip: 'Formula',
      click: context.options.callbacks.onFormula,
    })
    .render();
};

export const UndoBtn = context => {
  return $.summernote.ui
    .button({
      contents: window.isRTL ? '<i class="note-icon-redo"/>' : '<i class="note-icon-undo"/>',
      tooltip: 'Undo',
      click: context.options.callbacks.onUndo,
    })
    .render();
};

export const RedoBtn = context => {
  return $.summernote.ui
    .button({
      contents: window.isRTL ? '<i class="note-icon-undo"/>' : '<i class="note-icon-redo"/>',
      tooltip: 'Redo',
      click: context.options.callbacks.onRedo,
    })
    .render();
};
