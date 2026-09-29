/**
 * Assembles a full QTI assessment item from its parts: response declarations, the item
 * body, hints, and the outcome declarations and response processing that score it.
 */

import { HINT_CATALOG_ID, HINT_SUPPORT, hintHasContent } from './hints';
import { QTIDeclaration } from './qti/QTIDeclaration';
import { buildFloatNode, buildXmlNode, parseXML } from './xml';

const serializer = new XMLSerializer();

/**
 * Build the `<qti-catalog-info>` holding the item's hints, or null when there is nothing
 * to write. A catalog has to hold at least one card, so an item whose hints are all empty
 * carries no catalog at all rather than an empty one.
 *
 * @param {Array<{ content: string }>} hints
 * @returns {Element|null}
 */
function buildHintCatalogNode(hints) {
  const cards = hints.filter(hintHasContent).map(hint =>
    buildXmlNode({
      tag: 'qti-card',
      attrs: { support: HINT_SUPPORT },
      children: [buildXmlNode({ tag: 'qti-html-content', innerHTML: hint.content })],
    }),
  );

  if (!cards.length) {
    return null;
  }

  return buildXmlNode({
    tag: 'qti-catalog-info',
    children: [
      buildXmlNode({ tag: 'qti-catalog', attrs: { id: HINT_CATALOG_ID }, children: cards }),
    ],
  });
}

const SCORE = 'SCORE';
const RAW_SCORE = 'RAW_SCORE';

/** A float outcome: SCORE is the item's final score, RAW_SCORE the sum it averages. */
function buildOutcomeDeclarationNode(identifier) {
  return buildXmlNode({
    tag: 'qti-outcome-declaration',
    attrs: { identifier, cardinality: 'single', 'base-type': 'float' },
  });
}

/**
 * Regenerated on every save rather than carried over: an author's edit can invalidate the
 * rules a previous tool recorded. No response declaration — nothing to answer — means no
 * processing, as the converter does. One keeps match_correct. Several are each scored by
 * their declaration's rule and averaged; if any cannot be scored there is no processing,
 * since an average that skips a response would misgrade the item.
 *
 * @param {Element[]} declNodes
 * @returns {{ outcomeDeclarations: Element[], responseProcessing: Element|null }}
 */
function buildScoringNodes(declNodes) {
  const outcomeDeclarations = [buildOutcomeDeclarationNode(SCORE)];
  if (!declNodes.length) {
    return { outcomeDeclarations, responseProcessing: null };
  }
  if (declNodes.length === 1) {
    return {
      outcomeDeclarations,
      responseProcessing: buildXmlNode({
        tag: 'qti-response-processing',
        attrs: {
          template: 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml',
        },
      }),
    };
  }

  const scored = declNodes.map(node => {
    const identifier = node.getAttribute('identifier');
    try {
      return { identifier, rule: QTIDeclaration.fromXML(node).getScoringRule(RAW_SCORE) };
    } catch {
      // A declaration QTIDeclaration rejects has no rule to score it by.
      return { identifier, rule: null };
    }
  });
  const unscorable = scored.filter(({ rule }) => !rule).map(({ identifier }) => identifier);
  if (unscorable.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[QTI Editor] Writing no response processing: cannot score ${unscorable.join(', ')}`,
    );
    return { outcomeDeclarations, responseProcessing: null };
  }

  return {
    outcomeDeclarations: [...outcomeDeclarations, buildOutcomeDeclarationNode(RAW_SCORE)],
    responseProcessing: buildXmlNode({
      tag: 'qti-response-processing',
      children: [
        // Outcomes with no default start as NULL, and qti-sum with a NULL operand is NULL.
        buildXmlNode({
          tag: 'qti-set-outcome-value',
          attrs: { identifier: RAW_SCORE },
          children: [buildFloatNode(0)],
        }),
        ...scored.map(({ rule }) => rule),
        buildXmlNode({
          tag: 'qti-set-outcome-value',
          attrs: { identifier: SCORE },
          children: [
            buildXmlNode({
              tag: 'qti-divide',
              children: [
                buildXmlNode({ tag: 'qti-variable', attrs: { identifier: RAW_SCORE } }),
                buildFloatNode(declNodes.length),
              ],
            }),
          ],
        }),
      ],
    }),
  };
}

/**
 * Assembles a full QTI assessment-item XML string from its constituent parts.
 *
 * This is the write-path complement of parseItem. Call it whenever an interaction
 * editor emits an updated interaction to produce the raw_data stored on the item.
 * Attributes are set via setAttribute so the DOM handles all escaping — no manual
 * XML-escaping helpers are required.
 *
 * @param {object}   params
 * @param {string}   params.identifier            - Item identifier attribute
 * @param {string}   params.title                 - Item title attribute
 * @param {string}   params.language              - Language tag, or '' to omit it
 * @param {string}   params.bodyXml               - Serialized interaction element XML string
 * @param {string[]} params.responseDeclarations  - Array of serialized declaration XML strings
 * @param {Array<{ content: string }>} [params.hints] - Item hints, in order
 * @returns {string} Full QTI XML string
 */
export function assembleItemXml({
  identifier,
  title,
  language,
  bodyXml,
  responseDeclarations,
  hints = [],
}) {
  // Parse each serialized declaration string back into a DOM node so it can be
  // adopted into the assessment item tree via buildXmlNode's importNode logic.
  const declNodes = (responseDeclarations || []).map(declXml => {
    const doc = parseXML(declXml);
    return doc.documentElement;
  });

  const bodyDoc = parseXML(bodyXml || '<qti-item-body/>');
  const bodyRoot = bodyDoc.documentElement;
  const itemBodyNode =
    bodyRoot.tagName.toLowerCase() === 'qti-item-body'
      ? bodyRoot
      : buildXmlNode({
          tag: 'qti-item-body',
          children: [bodyRoot],
        });

  const catalogInfoNode = buildHintCatalogNode(hints);
  const { outcomeDeclarations, responseProcessing } = buildScoringNodes(declNodes);

  const assessmentItemNode = buildXmlNode({
    tag: 'qti-assessment-item',
    attrs: {
      xmlns: 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0',
      // New items get their identifier and title from createBlankItem.js; these fallbacks
      // only cover items assembled from XML that never carried them.
      identifier: identifier || 'item',
      title: title || '',
      adaptive: 'false',
      'time-dependent': 'false',
      // Omitted rather than guessed when the item has no language: the schema allows an
      // item without one.
      'xml:lang': language || null,
    },
    // The schema fixes this order: declarations, the body, the catalog, the processing.
    children: [
      ...declNodes,
      ...outcomeDeclarations,
      itemBodyNode,
      ...(catalogInfoNode ? [catalogInfoNode] : []),
      ...(responseProcessing ? [responseProcessing] : []),
    ],
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(assessmentItemNode)}`;
}
