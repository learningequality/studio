// Import the function we are testing
import { createCustomMarkdownSerializer } from '../TipTapEditor/utils/markdownSerializer';

// Mock the IMAGE_PLACEHOLDER to match what our tests expect
jest.mock('../TipTapEditor/utils/markdown', () => {
  const originalModule = jest.requireActual('../TipTapEditor/utils/markdown');
  return {
    ...originalModule,
    IMAGE_PLACEHOLDER: '${CONTENTSTORAGE}',
    paramsToImageMd: jest.fn(params => {
      const alt = params.alt || '';
      const src = params.permanentSrc ? `\${CONTENTSTORAGE}/${params.permanentSrc}` : params.src;
      const dimensions = params.width && params.height ? ` =${params.width}x${params.height}` : '';
      return `![${alt}](${src}${dimensions})`;
    }),
  };
});

// mock editor object with a proper ProseMirror-like structure
const createMockEditor = docContent => {
  // Create a mock node structure that mimics ProseMirror nodes
  const createNode = node => {
    const result = { ...node };

    // Add required properties expected by the serializer
    if (result.content) {
      const contentArray = result.content.map(createNode);
      result.content = {
        size: contentArray.length,
        content: contentArray,
        // Add forEach to support iteration in the serializer
        forEach: function (callback) {
          contentArray.forEach(callback);
        },
      };
    }

    if (result.type && typeof result.type === 'string') {
      result.type = { name: result.type };
    }

    if (result.type && result.type.name === 'text' && result.text) {
      result.textContent = result.text;
    }

    // Process marks to make them compatible with the serializer
    if (result.marks && Array.isArray(result.marks)) {
      result.marks = result.marks.map(mark => {
        if (typeof mark.type === 'string') {
          return { ...mark, type: { name: mark.type } };
        }
        return mark;
      });
    }

    return result;
  };

  // Create the document structure
  const doc = createNode({
    type: 'doc',
    content: docContent,
  });

  return {
    state: {
      doc: doc,
    },
  };
};

describe('createCustomMarkdownSerializer', () => {
  // 1: Custom Block Nodes
  describe('Custom Block Node Serialization', () => {
    it('should serialize a legacy image node using its permanentSrc', () => {
      const docContent = [
        {
          type: 'image',
          attrs: {
            src: '/content/storage/c/h/checksum.png',
            permanentSrc: 'checksum.png',
            alt: 'Legacy Cat',
            width: '150',
            height: '100',
          },
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);

      const expectedMd = '![Legacy Cat](${CONTENTSTORAGE}/checksum.png =150x100)';
      expect(getMarkdown()).toBe(expectedMd);
    });

    it('should serialize a new, unsaved data: URL image', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const docContent = [
        {
          type: 'image',
          attrs: {
            src: dataUrl,
            permanentSrc: null, // No permanent source yet
            alt: 'New Cat',
            width: '80',
            height: '60',
          },
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);

      const expectedMd = `![New Cat](${dataUrl} =80x60)`;
      expect(getMarkdown()).toBe(expectedMd);
    });

    it('should serialize a <small> node correctly', () => {
      const docContent = [
        {
          type: 'small',
          content: [{ type: 'text', text: 'This is small text.' }],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);

      const expectedMd = '<small>This is small text.</small>';
      expect(getMarkdown()).toBe(expectedMd);
    });
  });

  // 2: Custom Inline Nodes
  describe('Custom Inline Node Serialization', () => {
    it('should serialize a math node correctly', () => {
      const docContent = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'The formula is ' },
            { type: 'math', attrs: { latex: 'E=mc^2' } },
            { type: 'text', text: '.' },
          ],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);

      const expectedMd = 'The formula is $$E=mc^2$$.';
      expect(getMarkdown()).toBe(expectedMd);
    });
  });

  // 3: Standard Block Nodes
  describe('Standard Block Node Serialization', () => {
    it('should serialize headings with the correct level', () => {
      const docContent = [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'My Subtitle' }],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      expect(getMarkdown()).toBe('## My Subtitle');
    });

    it('should serialize nested lists correctly', () => {
      const docContent = [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        { type: 'paragraph', content: [{ type: 'text', text: 'Nested 1.1' }] },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }],
            },
          ],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      expect(getMarkdown()).toBe('- Item 1\n  - Nested 1.1\n- Item 2');
    });

    it('should place two newlines between block elements', () => {
      const docContent = [
        { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph.' }] },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      expect(getMarkdown()).toBe('First paragraph.\n\nSecond paragraph.');
    });
  });

  // 4: Inline Formatting (Marks)
  describe('Mark Serialization', () => {
    it('should serialize a text node with multiple marks correctly', () => {
      const docContent = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold and italic',
              marks: [{ type: 'bold' }, { type: 'italic' }],
            },
          ],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      // The order of marks can vary, but typically it's inside-out
      expect(getMarkdown()).toBe('*' + '**bold and italic**' + '*');
    });

    it('should serialize an underlined node with a <u> tag', () => {
      const docContent = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'underlined',
              marks: [{ type: 'underline' }],
            },
          ],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      expect(getMarkdown()).toBe('<u>underlined</u>');
    });

    it('should serialize a link node correctly', () => {
      const docContent = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Google',
              marks: [{ type: 'link', attrs: { href: 'https://google.com' } }],
            },
          ],
        },
      ];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      expect(getMarkdown()).toBe('[Google](https://google.com)');
    });
  });

  // 5: Edge cases
  describe('Structural and Edge Case Serialization', () => {
    it('should return an empty string for an empty document', () => {
      const docContent = [];
      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);
      expect(getMarkdown()).toBe('');
    });

    it('should serialize very deep nested lists correctly', () => {
      // Helper function to create nested list structure
      const createNestedList = (levels, currentLevel = 1) => {
        const listItem = {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: `Level ${currentLevel}` }] },
          ],
        };

        if (currentLevel < levels) {
          listItem.content.push({
            type: 'bulletList',
            content: [createNestedList(levels, currentLevel + 1)],
          });
        }

        return listItem;
      };

      const docContent = [
        {
          type: 'bulletList',
          content: [
            createNestedList(5),
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Back to Level 1' }] },
              ],
            },
          ],
        },
      ];

      const mockEditor = createMockEditor(docContent);
      const getMarkdown = createCustomMarkdownSerializer(mockEditor);

      const expectedMd =
        '- Level 1\n  - Level 2\n    - Level 3\n      - Level 4\n        - Level 5\n- Back to Level 1';
      expect(getMarkdown()).toBe(expectedMd);
    });
  });
});
