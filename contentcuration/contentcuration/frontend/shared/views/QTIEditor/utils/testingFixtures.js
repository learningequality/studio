// Centralized QTI Mock XML Fixtures for Unit Tests

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

/**
 * Text-entry fixtures use inline placement, so bodyXml is the full
 * <qti-item-body> rather than just the interaction element.
 * This is the shape that parseItem() produces for qti-text-entry-interaction.
 */
export const TEXT_ENTRY_BODY_XML = `<qti-item-body><div><div><p>What is H2O?</p></div><p><qti-text-entry-interaction response-identifier="RESPONSE"/></p></div></qti-item-body>`;

export const TEXT_ENTRY_NUMERIC_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float"><qti-correct-response><qti-value>42</qti-value></qti-correct-response></qti-response-declaration>`;

export const TEXT_ENTRY_STRING_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"><qti-correct-response><qti-value>H2O</qti-value></qti-correct-response></qti-response-declaration>`;

export const TEXT_ENTRY_FREE_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"/>`;

export const CHOICE_SINGLE_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
  <qti-correct-response><qti-value>mercury</qti-value></qti-correct-response>
</qti-response-declaration>`;

export const CHOICE_MULTI_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
  <qti-correct-response>
    <qti-value>a</qti-value>
    <qti-value>c</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

export const ORDERING_XML = `<qti-order-interaction response-identifier="RESPONSE" orientation="vertical" shuffle="true">
  <qti-prompt><p>Arrange the planets in order from closest to farthest from the Sun.</p></qti-prompt>
  <qti-simple-choice identifier="order_aaa11111">Mercury</qti-simple-choice>
  <qti-simple-choice identifier="order_bbb22222">Venus</qti-simple-choice>
  <qti-simple-choice identifier="order_ccc33333">Earth</qti-simple-choice>
</qti-order-interaction>`;

export const ORDERING_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">
  <qti-correct-response>
    <qti-value>order_aaa11111</qti-value>
    <qti-value>order_bbb22222</qti-value>
    <qti-value>order_ccc33333</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

// choice_eee55555 (Lysander) is unpaired — it is the fixture's distractor.
export const ASSOCIATE_XML = `<qti-associate-interaction response-identifier="RESPONSE" shuffle="true" max-associations="2">
  <qti-prompt><p>Match each character to his adversary.</p></qti-prompt>
  <qti-simple-associable-choice identifier="choice_aaa11111" match-max="1">Antonio</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_bbb22222" match-max="1">Prospero</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_ccc33333" match-max="1">Capulet</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_ddd44444" match-max="1">Montague</qti-simple-associable-choice>
  <qti-simple-associable-choice identifier="choice_eee55555" match-max="1">Lysander</qti-simple-associable-choice>
</qti-associate-interaction>`;

export const ASSOCIATE_DECL_XML = `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
  <qti-correct-response>
    <qti-value>choice_aaa11111 choice_bbb22222</qti-value>
    <qti-value>choice_ccc33333 choice_ddd44444</qti-value>
  </qti-correct-response>
</qti-response-declaration>`;

// Full QTI Assessment Item XML Documents

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

export const VALID_ASSOCIATE_ITEM_DOCUMENT = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-test-associate"
  title="Test Associate Question"
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  ${ASSOCIATE_DECL_XML}

  <qti-item-body>
    ${ASSOCIATE_XML}
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

/**
 * Wraps a snippet of interaction XML and a declaration into a mock 'block' object
 * @param {string} bodyXml
 * @param {string} declarationXml
 * @returns {object}
 */
export const mockInteractionBlockWithDecl = (bodyXml, declarationXml) => ({
  bodyXml,
  responseDeclarations: [declarationXml],
});
