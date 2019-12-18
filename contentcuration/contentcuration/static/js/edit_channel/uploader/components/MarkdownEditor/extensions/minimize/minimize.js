const EVENT_MINIMIZE_TOOLBAR_BTN_CLICK = 'MinimizeToolbarBtnClick';

const onMinimizeToolbarBtnClick = editor => {
  editor.options.extOptions.minimize.onMinimizeToolbarBtnClick();
};

const minimizeExtension = editor => {
  editor.eventManager.addEventType(EVENT_MINIMIZE_TOOLBAR_BTN_CLICK);
  editor.eventManager.listen(EVENT_MINIMIZE_TOOLBAR_BTN_CLICK, () => {
    onMinimizeToolbarBtnClick(editor);
  });

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'minimize',
        className: 'tui-toolbar-btn-minimize',
        event: EVENT_MINIMIZE_TOOLBAR_BTN_CLICK,
        tooltip: 'Minimize',
      },
    });
};

export default minimizeExtension;
