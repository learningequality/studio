import Editor from 'tui-editor';

import './undo-redo.css';
import undoRedoExtension from './undo-redo.js';

const EXT_NAME = 'undo-redo';

Editor.defineExtension(EXT_NAME, undoRedoExtension);

export default EXT_NAME;
