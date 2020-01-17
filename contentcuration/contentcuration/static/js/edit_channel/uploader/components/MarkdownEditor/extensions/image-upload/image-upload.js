const EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK = 'ImageUploadToolbarBtnClick';

const onImageUploadToolbarBtnClick = editor => {
  editor.options.extOptions.imageUpload.onImageUploadToolbarBtnClick();
};

const onImageDrop = editor => {
  editor.options.extOptions.imageUpload.onImageDrop();
};

const imageUploadExtension = editor => {
  editor.addHook('addImageBlobHook', () => {
    onImageDrop(editor);
  });

  editor.eventManager.addEventType(EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK);
  editor.eventManager.listen(EVENT_IMAGE_UPLOAD_TOOLBAR_BTN_CLICK, () => {
    onImageUploadToolbarBtnClick(editor);
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
        tooltip: editor.options.extOptions.imageUpload.toolbarBtnTooltip,
      },
    });
};

export default imageUploadExtension;
