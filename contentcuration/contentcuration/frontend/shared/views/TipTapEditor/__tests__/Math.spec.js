import { Schema } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import {
  getSelectedMathNodeDecorations,
  selectedMathNodeClass,
} from '../TipTapEditor/extensions/Math';

jest.mock('../TipTapEditor/components/math/LazyMathNodeView.vue', () => ({}));

const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM() {
        return ['p', 0];
      },
    },
    text: {
      group: 'inline',
    },
    math: {
      inline: true,
      group: 'inline',
      attrs: {
        latex: {
          default: null,
        },
      },
      toDOM(node) {
        return ['span', { 'data-latex': node.attrs.latex }];
      },
    },
  },
});

function createDoc() {
  return schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, [
      schema.text('before '),
      schema.nodes.math.create({ latex: 'x^2' }),
      schema.text(' after'),
    ]),
  ]);
}

function getMathPosition(doc) {
  let mathPosition;

  doc.descendants((node, pos) => {
    if (node.type.name === 'math') {
      mathPosition = pos;
    }
  });

  return mathPosition;
}

describe('Math extension selection decorations', () => {
  it('decorates a math node fully covered by a text selection', () => {
    const doc = createDoc();
    const mathPosition = getMathPosition(doc);
    const mathNode = doc.nodeAt(mathPosition);
    const selection = TextSelection.create(
      doc,
      mathPosition - 1,
      mathPosition + mathNode.nodeSize + 1,
    );

    const decorations = getSelectedMathNodeDecorations(doc, selection);

    expect(decorations).toHaveLength(1);
    expect(decorations[0].from).toBe(mathPosition);
    expect(decorations[0].to).toBe(mathPosition + mathNode.nodeSize);
    expect(decorations[0].type.attrs.class).toBe(selectedMathNodeClass);
  });

  it('does not decorate math nodes for empty or uncovered selections', () => {
    const doc = createDoc();
    const mathPosition = getMathPosition(doc);
    const mathNode = doc.nodeAt(mathPosition);
    const emptySelection = TextSelection.create(doc, mathPosition);
    const uncoveredSelection = TextSelection.create(doc, mathPosition - 2, mathPosition);

    expect(getSelectedMathNodeDecorations(doc, emptySelection)).toHaveLength(0);
    expect(getSelectedMathNodeDecorations(doc, uncoveredSelection)).toHaveLength(0);

    const partiallyCoveredSelection = TextSelection.create(
      doc,
      mathPosition,
      mathPosition + mathNode.nodeSize - 1,
    );

    expect(getSelectedMathNodeDecorations(doc, partiallyCoveredSelection)).toHaveLength(0);
  });
});
