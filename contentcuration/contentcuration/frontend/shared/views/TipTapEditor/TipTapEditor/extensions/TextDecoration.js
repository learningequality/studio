/*
 * Underline and strikethrough, written as a decorated <span> rather than <u> or <s>.
 *
 * The QTI 3.0 HTML profile has neither element, so an item carrying one is rejected by
 * the item schema. It does have <span>, and the schema admits a `style` attribute
 * through its lax wildcard, so the decoration travels as a style instead — the same way
 * TextAlign already carries alignment.
 *
 * Only the output changes. Upstream's parse rules already read `text-decoration` off a
 * style attribute, so a span written here comes back as the mark that wrote it, and a
 * pasted <u> or <s> still arrives as one.
 */
import { mergeAttributes } from '@tiptap/core';
import { Strike } from '@tiptap/extension-strike';
import { Underline } from '@tiptap/extension-underline';

const renderAsDecoratedSpan = decoration =>
  function renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: `text-decoration: ${decoration}`,
      }),
      0,
    ];
  };

export const StyledStrike = Strike.extend({
  renderHTML: renderAsDecoratedSpan('line-through'),
});

export const StyledUnderline = Underline.extend({
  renderHTML: renderAsDecoratedSpan('underline'),
});
