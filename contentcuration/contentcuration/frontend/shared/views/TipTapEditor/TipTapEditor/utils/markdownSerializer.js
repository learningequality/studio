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

    const serializeNode = (node, listNumber = null) => {
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
                serializeNode(child);
              }
            }
          }
          break;

        case 'paragraph':
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                serializeNode(child);
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
                serializeNode(child);
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
                serializeNode(child);
              }
            }
          }
          result += '</small>';
          break;

        case 'bulletList':
          for (let i = 0; i < node.content.size; i++) {
            const child = node.content.content[i];
            if (child) {
              serializeNode(child, 'bullet');
              if (i < node.content.size - 1) result += '\n';
            }
          }
          break;

        case 'orderedList':
          for (let i = 0; i < node.content.size; i++) {
            const child = node.content.content[i];
            if (child) {
              serializeNode(child, i + 1);
              if (i < node.content.size - 1) result += '\n';
            }
          }
          break;

        case 'listItem':
          // Use the passed listNumber parameter
          if (listNumber === 'bullet') {
            result += '- ';
          } else if (typeof listNumber === 'number') {
            result += `${listNumber}. `;
          }

          // Process list item content properly
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child && child.type) {
                if (child.type.name === 'paragraph') {
                  // For paragraphs in list items, process their content directly
                  if (child.content && child.content.size > 0) {
                    for (let j = 0; j < child.content.size; j++) {
                      const grandchild = child.content.content[j];
                      if (grandchild) {
                        serializeNode(grandchild);
                      }
                    }
                  }
                } else {
                  serializeNode(child);
                }
              }
            }
          }
          break;

        case 'blockquote':
          result += '> ';
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) {
                serializeNode(child);
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
            node.content.forEach(child => serializeNode(child));
          }
          break;
      }
    };

    serializeNode(doc, true);
    return result.trim();
  };
};
