const EVENT_FORMULAS_TOOLBAR_BTN_CLICK = 'FormulasToolbarBtnClick';

const onFormulasToolbarBtnClick = editor => {
  editor.options.extOptions.formulas.onFormulasToolbarBtnClick();
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
        // should match ./formulas.css
        className: 'tui-toolbar-btn-formulas',
        event: EVENT_FORMULAS_TOOLBAR_BTN_CLICK,
        tooltip: editor.options.extOptions.formulas.toolbarBtnTooltip,
      },
    });
};

export default formulasExtension;
