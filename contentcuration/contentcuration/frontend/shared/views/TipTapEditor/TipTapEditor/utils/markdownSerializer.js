// Custom markdown serialization that handles Math nodes properly
import { paramsToMathMd, paramsToImageMd } from './markdown';

export const createCustomMarkdownSerializer = editor => {
  return function getMarkdown() {
    const doc = editor.state.doc;
    let result = '';

    // Handle marks (bold, italic, etc.)
    const serializeMarks = node => {
      if (!node.marks || node.marks.length === 0) return node.text || '';

      let text = node.text || '';
      node.marks.forEach(mark => {
        switch (mark.type.name) {
          case 'bold':
            text = `**${text}**`;
            break;
          case 'italic':
            text = `*${text}*`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'strike':
            text = `~~${text}~~`;
            break;
          case 'code':
            text = `\`${text}\``;
            break;
          case 'link': {
            const href = mark.attrs.href || '';
            text = `[${text}](${href})`;
            break;
          }
          case 'superscript':
            text = `<sup>${text}</sup>`;
            break;
          case 'subscript':
            text = `<sub>${text}</sub>`;
            break;
        }
      });
      return text;
    };

    const serializeNode = (node, listNumber = null, depth = 0) => {
      if (!node || !node.type) {
        return;
      }

      switch (node.type.name) {
        case 'doc':
          // Process all children
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                if (i > 0) result += '\n\n';
                serializeNode(child, null, depth);
              }
            }
          }
          break;

        case 'paragraph':
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                serializeNode(child, null, depth);
              }
            }
          }
          break;

        case 'heading': {
          const level = node.attrs.level || 1;
          result += '#'.repeat(level) + ' ';
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                serializeNode(child, null, depth);
              }
            }
          }
          break;
        }

        case 'text':
          result += serializeMarks(node);
          break;

        case 'math':
          result += paramsToMathMd(node.attrs);
          break;

        case 'image':
          result += paramsToImageMd(node.attrs);
          break;

        case 'small':
          result += '<small>';
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                serializeNode(child, null, depth);
              }
            }
          }
          result += '</small>';
          break;

        case 'bulletList':
          for (let i = 0; i < node.content.size; i++) {
            const child = node.content.content[i];
            if (child) {
              serializeNode(child, 'bullet', depth);
              if (i < node.content.size - 1) result += '\n';
            }
          }
          break;

        case 'orderedList':
          for (let i = 0; i < node.content.size; i++) {
            const child = node.content.content[i];
            if (child) {
              serializeNode(child, i + 1, depth);
              if (i < node.content.size - 1) result += '\n';
            }
          }
          break;

        case 'listItem': {
          // Add indentation for nested lists
          const indent = '  '.repeat(depth);

          // Use the passed listNumber parameter
          if (listNumber === 'bullet') {
            result += indent + '- ';
          } else if (typeof listNumber === 'number') {
            result += indent + `${listNumber}. `;
          }

          // Process list item content properly
          if (node.content && node.content.size > 0) {
            let hasProcessedFirstParagraph = false;

            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child && child.type) {
                if (child.type.name === 'paragraph') {
                  // For paragraphs in list items, process their content directly
                  if (child.content && child.content.size > 0) {
                    for (let j = 0; j < child.content.size; j++) {
                      const grandchild = child.content.content[j];
                      if (grandchild) {
                        serializeNode(grandchild, null, depth);
                      }
                    }
                  }
                  hasProcessedFirstParagraph = true;
                } else if (child.type.name === 'bulletList' || child.type.name === 'orderedList') {
                  // Handle nested lists
                  if (hasProcessedFirstParagraph) {
                    result += '\n';
                  }
                  serializeNode(child, null, depth + 1);
                } else {
                  serializeNode(child, null, depth);
                }
              }
            }
          }
          break;
        }

        case 'blockquote':
          result += '> ';
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                serializeNode(child, null, depth);
              }
            }
          }
          break;

        case 'codeBlock': {
          const language = node.attrs.language || '';
          result += '```' + language + '\n';
          result += node.textContent;
          result += '\n```';
          break;
        }

        case 'hardBreak':
          result += '  \n';
          break;

        case 'horizontalRule':
          result += '---';
          break;

        default:
          // Fallback: try to process children
          if (node.content) {
            node.content.forEach(child => serializeNode(child, null, depth));
          }
          break;
      }
    };

    serializeNode(doc, null, 0);
    return result.trim();
  };
};
