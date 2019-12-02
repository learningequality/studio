import Editor from 'tui-editor';

import './minimize.css';
import minimizeExtension from './minimize.js';

const EXT_NAME = 'minimize';

Editor.defineExtension(EXT_NAME, minimizeExtension);

export default EXT_NAME;
