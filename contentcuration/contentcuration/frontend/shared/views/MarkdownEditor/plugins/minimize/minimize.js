const EVENT_MINIMIZE_TOOLBAR_BTN_CLICK = 'MinimizeToolbarBtnClick';

const minimizeExtension = (editor, options) => {
  editor.eventManager.addEventType(EVENT_MINIMIZE_TOOLBAR_BTN_CLICK);
  editor.eventManager.listen(EVENT_MINIMIZE_TOOLBAR_BTN_CLICK, () => {
    options.onMinimizeToolbarBtnClick();
  });

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'minimize',
        // should match ./minimize.css
        className: 'tui-toolbar-btn-minimize',
        event: EVENT_MINIMIZE_TOOLBAR_BTN_CLICK,
        tooltip: options.toolbarBtnTooltip,
      },
    });
};

export default minimizeExtension;
