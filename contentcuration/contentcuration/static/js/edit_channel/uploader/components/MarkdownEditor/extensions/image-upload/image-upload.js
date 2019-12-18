const IMAGE_UPLOAD_BTN_EVENT = 'ImageUploadBtnClick';

const onImageUpload = () => {
  alert('Image upload TBD');
};

const onImageDrop = () => {
  alert('Image drop TBD');
};

const imageUploadExtension = editor => {
  editor.eventManager.addEventType(IMAGE_UPLOAD_BTN_EVENT);
  editor.eventManager.listen(IMAGE_UPLOAD_BTN_EVENT, onImageUpload);

  editor
    .getUI()
    .getToolbar()
    .addItem({
      type: 'button',
      options: {
        name: 'image-upload',
        className: 'tui-toolbar-btn-image-upload',
        event: IMAGE_UPLOAD_BTN_EVENT,
        tooltip: 'Insert image',
      },
    });

  editor.addHook('addImageBlobHook', onImageDrop);
};

export default imageUploadExtension;
