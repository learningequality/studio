// Custom markdown serialization that handles Math nodes properly
import { paramsToMathMd, paramsToImageMd } from './markdown';

export const createCustomMarkdownSerializer = editor => {
  return function getMarkdown() {
    const doc = editor.state.doc;

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

    // Recursively process nodes
    const serializeNode = (node, listNumber = null, depth = 0) => {
      if (!node || !node.type) {
        return;
      }

      switch (node.type.name) {
        case 'doc': {
          const parts = [];
          // Process all children
          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (child) parts.push(serializeNode(child, null, depth));
            }
          }
          return parts.join('\n\n');
        }

        case 'paragraph': {
          const inner = serializeChildren(node, null, depth);
          const align = node.attrs?.textAlign;
          if (align && align !== 'left') {
            return `<p style="text-align: ${align}">${inner}</p>`;
          }
          return inner;
        }

        case 'heading': {
          const level = node.attrs.level || 1;
          const inner = serializeChildren(node, null, depth);
          const align = node.attrs?.textAlign;
          const prefix = '#'.repeat(level) + ' ';
          if (align && align !== 'left') {
            return `<h${level} style="text-align: ${align}">${inner}</h${level}>`;
          }
          return prefix + inner;
        }

        case 'text':
          return serializeMarks(node);

        case 'math':
          return paramsToMathMd(node.attrs);

        case 'image':
          return paramsToImageMd(node.attrs);

        case 'small':
          return `<small>${serializeChildren(node, null, depth)}</small>`;

        case 'bulletList': {
          const items = [];
          for (let i = 0; i < node.content.size; i++) {
            const child = node.content.content[i];
            if (child) items.push(serializeNode(child, 'bullet', depth));
          }
          return items.join('\n');
        }

        case 'orderedList': {
          const items = [];
          for (let i = 0; i < node.content.size; i++) {
            const child = node.content.content[i];
            if (child) items.push(serializeNode(child, i + 1, depth));
          }
          return items.join('\n');
        }

        case 'listItem': {
          // Add indentation for nested lists
          const indent = '  '.repeat(depth);
          const prefix = listNumber === 'bullet' ? indent + '- ' : indent + `${listNumber}. `;

          let out = prefix;
          let hasProcessedFirstParagraph = false;

          if (node.content && node.content.size > 0) {
            for (let i = 0; i < node.content.size; i++) {
              const child = node.content.content[i];
              if (!child?.type) continue;

              if (child.type.name === 'paragraph') {
                out += serializeChildren(child, null, depth);
                hasProcessedFirstParagraph = true;
              } else if (child.type.name === 'bulletList' || child.type.name === 'orderedList') {
                // Handle nested lists
                if (hasProcessedFirstParagraph) out += '\n';
                out += serializeNode(child, null, depth + 1);
              } else {
                out += serializeNode(child, null, depth);
              }
            }
          }
          return out;
        }

        case 'blockquote':
          return '> ' + serializeChildren(node, null, depth);

        case 'codeBlock': {
          const language = node.attrs.language || '';
          return '```' + language + '\n' + node.textContent + '\n```';
        }

        case 'hardBreak':
          return '  \n';

        case 'horizontalRule':
          return '---';

        default:
          // Fallback: try to process children
          return serializeChildren(node, null, depth);
      }
    };

    const serializeChildren = (node, listNumber = null, depth = 0) => {
      if (!node.content || node.content.size === 0) return '';
      let out = '';
      for (let i = 0; i < node.content.size; i++) {
        const child = node.content.content[i];
        if (child) out += serializeNode(child, listNumber, depth);
      }
      return out;
    };

    return serializeNode(doc, null, 0).trim();
  };
};
