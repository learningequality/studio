import Editor from 'tui-editor';
import Viewer from 'tui-editor/dist/tui-editor-Viewer';

import './formulas.css';
import formulasExtension from './formulas.js';
import markdownitFormula from './markdown-it-formula';

const EXT_NAME = 'formulas';

[Editor, Viewer].forEach(tui => {
  tui.markdownit.use(markdownitFormula);
  tui.markdownitHighlight.use(markdownitFormula);
  tui.defineExtension(EXT_NAME, formulasExtension);
});

export default EXT_NAME;
