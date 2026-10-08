/**
 * Response-processing pieces shared by the declaration strategies' getScoringRule.
 */
import { buildXmlNode } from '../../xml.js';

/**
 * Build a rule that adds an expression's value to an outcome:
 * `outcome = outcome + expression`.
 *
 * The outcome must already hold a number when the rule runs. qti-sum with a NULL operand
 * is NULL, so whoever declares the outcome also resets it first.
 *
 * @param {string}  outcomeIdentifier - The outcome to add to
 * @param {Element} expression - A numeric QTI expression, e.g. `<qti-map-response>`
 * @returns {Element} A `<qti-set-outcome-value>` rule
 */
export function buildAddToOutcomeNode(outcomeIdentifier, expression) {
  return buildXmlNode({
    tag: 'qti-set-outcome-value',
    attrs: { identifier: outcomeIdentifier },
    children: [
      buildXmlNode({
        tag: 'qti-sum',
        children: [
          buildXmlNode({ tag: 'qti-variable', attrs: { identifier: outcomeIdentifier } }),
          expression,
        ],
      }),
    ],
  });
}
