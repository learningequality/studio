const EVENT_FORMULAS_TOOLBAR_BTN_CLICK = 'FormulasToolbarBtnClick';

const onFormulasToolbarBtnClick = editor => {
  let cursor = editor.wwEditor.getEditor().getCursorPosition();

  editor.options.extOptions.formulas.onFormulasToolbarBtnClick({
    editorCursorPosition: {
      bottom: cursor.y + cursor.height,
      left: cursor.x,
    },
  });
};

const formulasExtension = editor => {
  if (editor.isViewer()) {
    return;
  }

  editor.eventManager.addEventType(EVENT_FORMULAS_TOOLBAR_BTN_CLICK);
  editor.eventManager.listen(EVENT_FORMULAS_TOOLBAR_BTN_CLICK, () =>
    onFormulasToolbarBtnClick(editor)
  );

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'formulas',
        className: 'tui-toolbar-btn-formulas',
        event: EVENT_FORMULAS_TOOLBAR_BTN_CLICK,
        tooltip: 'Insert formula',
      },
    });
};

export default formulasExtension;
