// ---------------------------------------------------------------------------
// Centralized QTI Mock XML Fixtures for Unit Tests
// ---------------------------------------------------------------------------

export const CHOICE_SINGLE_SELECT_XML = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
  <qti-prompt>Which planet is closest to the Sun?</qti-prompt>
  <qti-simple-choice identifier="mercury">Mercury</qti-simple-choice>
  <qti-simple-choice identifier="venus">Venus</qti-simple-choice>
  <qti-simple-choice identifier="earth">Earth</qti-simple-choice>
</qti-choice-interaction>`;

export const CHOICE_MULTI_SELECT_XML = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="2">
  <qti-prompt>Select all that apply.</qti-prompt>
  <qti-simple-choice identifier="a">Option A</qti-simple-choice>
  <qti-simple-choice identifier="b">Option B</qti-simple-choice>
  <qti-simple-choice identifier="c">Option C</qti-simple-choice>
</qti-choice-interaction>`;

export const CHOICE_NO_PROMPT_XML = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
  <qti-simple-choice identifier="a">A</qti-simple-choice>
</qti-choice-interaction>`;

export const UNKNOWN_INTERACTION_XML = `<qti-unknown-interaction response-identifier="RESPONSE">
  <qti-prompt>Unknown.</qti-prompt>
</qti-unknown-interaction>`;

// ---------------------------------------------------------------------------
// Full QTI Assessment Item XML Documents
// ---------------------------------------------------------------------------

export const VALID_CHOICE_ITEM_DOCUMENT = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-test-1"
  title="Test Question"
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  <qti-response-declaration
    identifier="RESPONSE"
    cardinality="single"
    base-type="identifier"
  >
    <qti-correct-response>
      <qti-value>choice-a</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-prompt>Pick one.</qti-prompt>
      <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
      <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
</qti-assessment-item>`;

export const TWO_INTERACTIONS_DOCUMENT = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-multi"
  title="Multi Interaction"
  adaptive="false"
  time-dependent="false"
  xml:lang="fr"
>
  <qti-response-declaration identifier="RESP1" cardinality="single" base-type="identifier" />
  <qti-response-declaration identifier="RESP2" cardinality="single" base-type="string" />

  <qti-item-body>
    <p>Intro text</p>
    <qti-choice-interaction response-identifier="RESP1" max-choices="1">
      <qti-prompt>Question 1</qti-prompt>
    </qti-choice-interaction>
    <p>Middle text</p>
    <qti-text-entry-interaction response-identifier="RESP2" />
  </qti-item-body>
</qti-assessment-item>`;

/**
 * Wraps a snippet of interaction XML into a mock 'block' object
 * simulating the output of useQtiItem()
 * @param {string} bodyXml
 * @returns {object}
 */
export const mockInteractionBlock = bodyXml => ({
  bodyXml,
  responseDeclarations: [],
});
