const UNDO_BTN_EVENT = 'UndoBtnCLick';
const REDO_BTN_EVENT = 'RedoBtnCLick';

const onUndoClick = editor => {
  editor.wwEditor.getEditor().undo();
};

const onRedoClick = editor => {
  editor.wwEditor.getEditor().redo();
};

const undoRedoExtension = editor => {
  editor.eventManager.addEventType(UNDO_BTN_EVENT);
  editor.eventManager.listen(UNDO_BTN_EVENT, () => onUndoClick(editor));

  editor.eventManager.addEventType(REDO_BTN_EVENT);
  editor.eventManager.listen(REDO_BTN_EVENT, () => onRedoClick(editor));

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'undo',
        className: 'tui-toolbar-btn-undo',
        event: UNDO_BTN_EVENT,
        tooltip: 'Undo',
      },
    });

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'redo',
        className: 'tui-toolbar-btn-redo',
        event: REDO_BTN_EVENT,
        tooltip: 'Redo',
      },
    });
};

export default undoRedoExtension;
