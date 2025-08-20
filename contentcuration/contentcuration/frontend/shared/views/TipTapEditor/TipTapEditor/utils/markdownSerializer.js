// Custom markdown serialization that handles Math nodes properly
import { paramsToMathMd, paramsToImageMd } from './markdown';

export const createCustomMarkdownSerializer = editor => {
  return function getMarkdown() {
    const doc = editor.state.doc;
    let result = '';

    // Handle marks (bold, italic, etc.)
    const serializeMarks = node => {
      if (!node.marks || node.marks.length === 0) return node.text || '';

      const text = node.text || '';
      // Markdown only works if it's sticky to the text
      const leadingWhitespace = text.match(/^\s+/)?.[0] || '';
      const trailingWhitespace = text.match(/\s+$/)?.[0] || '';
      let trimmedText = text.trim();

      node.marks.forEach(mark => {
        switch (mark.type.name) {
          case 'bold':
            trimmedText = `**${trimmedText}**`;
            break;
          case 'italic':
            trimmedText = `*${trimmedText}*`;
            break;
          case 'underline':
            trimmedText = `<u>${trimmedText}</u>`;
            break;
          case 'strike':
            trimmedText = `~~${trimmedText}~~`;
            break;
          case 'code':
            trimmedText = `\`${trimmedText}\``;
            break;
          case 'link': {
            const href = mark.attrs.href || '';
            trimmedText = `[${trimmedText}](${href})`;
            break;
          }
          case 'superscript':
            trimmedText = `<sup>${trimmedText}</sup>`;
            break;
          case 'subscript':
            trimmedText = `<sub>${trimmedText}</sub>`;
            break;
        }
      });
      return leadingWhitespace + trimmedText + trailingWhitespace;
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
