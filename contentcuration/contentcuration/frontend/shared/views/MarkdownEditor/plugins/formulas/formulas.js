const EVENT_FORMULAS_TOOLBAR_BTN_CLICK = 'FormulasToolbarBtnClick';

const formulasExtension = (editor, options) => {
  if (editor.isViewer()) {
    return;
  }

  editor.eventManager.addEventType(EVENT_FORMULAS_TOOLBAR_BTN_CLICK);
  editor.eventManager.listen(EVENT_FORMULAS_TOOLBAR_BTN_CLICK, () =>
    options.onFormulasToolbarBtnClick(),
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
        tooltip: options.toolbarBtnTooltip,
      },
    });
};

export default formulasExtension;
