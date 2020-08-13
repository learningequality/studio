const EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK = 'ImageUploadToolbarBtnClick';

const imageUploadExtension = (editor, options) => {
  if (editor.isViewer()) {
    return;
  }

  editor.addHook('addImageBlobHook', options.onImageDrop);

  editor.eventManager.addEventType(EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK);
  editor.eventManager.listen(EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK, () => {
    options.onImageUploadToolbarBtnClick();
  });

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'image-upload',
        // should match ./image-upload.css
        className: 'tui-toolbar-btn-image-upload',
        event: EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK,
        tooltip: options.toolbarBtnTooltip,
      },
    });
};

export default imageUploadExtension;
