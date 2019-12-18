import Editor from 'tui-editor';

import './image-upload.css';
import imageUploadExtension from './image-upload.js';

const EXT_NAME = 'image-upload';

Editor.defineExtension(EXT_NAME, imageUploadExtension);

export default EXT_NAME;
