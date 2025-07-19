import { Markdown as TiptapMarkdown } from 'tiptap-markdown';
import {
  IMAGE_REGEX,
  imageMdToParams,
  paramsToImageMd,
  MATH_REGEX,
  mathMdToParams,
  paramsToMathMd,
} from '../utils/markdown';

export const Markdown = TiptapMarkdown.configure({
  html: true,
  bulletList: {
    tight: true,
  },
  orderedList: {
    tight: true,
  },
  // --- LOADING CONFIGURATION ---
  // This hook pre-processes the raw Markdown string before parsing.
  transformMarkdown: markdown => {
    let processedMarkdown = markdown;

    // Replace custom images with standard <img> tags
    processedMarkdown = processedMarkdown.replace(IMAGE_REGEX, match => {
      const params = imageMdToParams(match);
      if (!params) return match;
      return `<img src="${params.src}" alt="${params.alt}" width="${params.width}" height="${params.height}" />`;
    });

    // Replace $$...$$ with a custom <span> tag for our Math extension
    processedMarkdown = processedMarkdown.replace(MATH_REGEX, match => {
      const params = mathMdToParams(match);
      if (!params) return match;
      return `<span data-latex="${params.latex}"></span>`;
    });

    return processedMarkdown;
  },

  // --- SAVING CONFIGURATION ---
  // These rules override the default serializers for specific nodes and marks.
  toMarkdown: {
    // --- Custom Node Rules ---
    image(state, node) {
      state.write(paramsToImageMd(node.attrs));
    },
    math(state, node) {
      state.write(paramsToMathMd(node.attrs));
    },
    small(state, node) {
      state.write('<small>');
      state.renderContent(node);
      state.write('</small>');
      state.closeBlock(node);
    },
    // --- Custom Mark Rules ---
    underline: {
      open: '<u>',
      close: '</u>',
      mixable: true,
    },
  },
});
