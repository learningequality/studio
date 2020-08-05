import Editor from 'tui-editor';
import Viewer from 'tui-editor/dist/tui-editor-Viewer';

import './image-upload.css';
import imagesExtension from './image-upload.js';
import markdownitImage from './markdown-it-image';

const EXT_NAME = 'image-upload';

[Editor, Viewer].forEach(tui => {
  tui.markdownit.use(markdownitImage);
  tui.markdownitHighlight.use(markdownitImage);
  tui.defineExtension(EXT_NAME, imagesExtension);
});

export default EXT_NAME;
