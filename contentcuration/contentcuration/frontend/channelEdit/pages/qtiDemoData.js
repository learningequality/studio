import { AssessmentItemTypes } from 'shared/views/QTIEditor/constants';

/**
 * Demo item 1: a real choice interaction XML so the full load path can
 * be verified end-to-end (parseItem → useQtiItem → InteractionSection →
 * ChoiceInteractionEditor).
 */
export const CHOICE_ITEM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-1"
  title="Which planet is closest to the Sun?"
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
      <qti-value>mercury</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-item-body>
    <qti-choice-interaction
      response-identifier="RESPONSE"
      max-choices="1"
    >
      <qti-prompt>Which planet is closest to the Sun?</qti-prompt>
      <qti-simple-choice identifier="mercury">Mercury</qti-simple-choice>
      <qti-simple-choice identifier="venus">Venus</qti-simple-choice>
      <qti-simple-choice identifier="earth">Earth</qti-simple-choice>
      <qti-simple-choice identifier="mars">Mars</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
</qti-assessment-item>`;

/**
 * Demo item 2: a multi-select choice interaction XML (max-choices > 1).
 */
export const MULTI_CHOICE_ITEM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-2"
  title="Select all the prime numbers."
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  <qti-response-declaration
    identifier="RESPONSE"
    cardinality="multiple"
    base-type="identifier"
  >
    <qti-correct-response>
      <qti-value>two</qti-value>
      <qti-value>three</qti-value>
      <qti-value>five</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-item-body>
    <qti-choice-interaction
      response-identifier="RESPONSE"
      max-choices="4"
    >
      <qti-prompt>Select all the prime numbers.</qti-prompt>
      <qti-simple-choice identifier="one">1</qti-simple-choice>
      <qti-simple-choice identifier="two">2</qti-simple-choice>
      <qti-simple-choice identifier="three">3</qti-simple-choice>
      <qti-simple-choice identifier="four">4</qti-simple-choice>
      <qti-simple-choice identifier="five">5</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
</qti-assessment-item>`;

/**
 * Hardcoded items covering different states:
 *  - item-1: has raw_data (real QTI XML) → exercises the full load path
 *  - item-2: no raw_data → shows placeholder (blank new item state)
 *  - item-3: no raw_data → shows placeholder
 */
export const INITIAL_ASSESSMENTS = [
  {
    assessment_id: 'demo-item-1',
    type: AssessmentItemTypes.QTI,
    raw_data: CHOICE_ITEM_XML,
  },
  {
    assessment_id: 'demo-item-2',
    type: AssessmentItemTypes.QTI,
    raw_data: MULTI_CHOICE_ITEM_XML,
  },
  {
    assessment_id: 'demo-item-3',
    type: AssessmentItemTypes.QTI,
  },
];
