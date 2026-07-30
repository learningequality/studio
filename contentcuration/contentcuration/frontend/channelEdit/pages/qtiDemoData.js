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
 * Demo item 3: numeric text-entry — student types an acceptable number.
 */
export const NUMERIC_ITEM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-numeric"
  title="Speed of light"
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  <qti-response-declaration
    identifier="RESPONSE"
    cardinality="multiple"
    base-type="float"
  >
    <qti-correct-response>
      <qti-value>299792458</qti-value>
      <qti-value>3e8</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-item-body>
    <div>
      <div><p>What is the speed of light in m/s? (enter one of the accepted values)</p></div>
      <p><qti-text-entry-interaction response-identifier="RESPONSE"/></p>
    </div>
  </qti-item-body>
</qti-assessment-item>`;

/**
 * Demo item 4: textEntry — student types a string answer (case-sensitive option shown).
 */
export const TEXT_ENTRY_ITEM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-text-entry"
  title="Chemical symbol for water"
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  <qti-response-declaration
    identifier="RESPONSE"
    cardinality="single"
    base-type="string"
  >
    <qti-correct-response>
      <qti-value>H2O</qti-value>
      <qti-value>h2o</qti-value>
      <qti-value>H2o</qti-value>
    </qti-correct-response>

    <!-- Per-answer case sensitivity lives here; entries are case-insensitive by
         default, so only the case-sensitive answer carries the attribute. -->
    <qti-mapping default-value="0">
      <qti-map-entry map-key="H2O" mapped-value="1" case-sensitive="true"/>
      <qti-map-entry map-key="h2o" mapped-value="1"/>
      <qti-map-entry map-key="H2o" mapped-value="1"/>
    </qti-mapping>
  </qti-response-declaration>

  <qti-item-body>
    <div>
      <div><p>What is the chemical symbol for water?</p></div>
      <p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="10"/></p>
    </div>
  </qti-item-body>
</qti-assessment-item>`;

/**
 * Demo item 5: freeResponse — open-ended, no correct answer.
 */
export const FREE_RESPONSE_ITEM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="item-free-response"
  title="Describe photosynthesis"
  adaptive="false"
  time-dependent="false"
  xml:lang="en"
>
  <qti-response-declaration
    identifier="RESPONSE"
    cardinality="single"
    base-type="string"
  />

  <qti-item-body>
    <div>
      <div><p>Describe the process of photosynthesis in your own words.</p></div>
      <p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="50"/></p>
    </div>
  </qti-item-body>
</qti-assessment-item>`;

/**
 * Hardcoded items covering different states:
 *  - item-1: single-select choice interaction
 *  - item-2: multi-select choice interaction
 *  - item-numeric: numeric text-entry
 *  - item-text-entry: string text-entry with case-sensitive answers
 *  - item-free-response: free-response text-entry (no correct answer)
 *  - item-blank: no raw_data → shows placeholder (blank new item state)
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
    assessment_id: 'demo-item-numeric',
    type: AssessmentItemTypes.QTI,
    raw_data: NUMERIC_ITEM_XML,
  },
  {
    assessment_id: 'demo-item-text-entry',
    type: AssessmentItemTypes.QTI,
    raw_data: TEXT_ENTRY_ITEM_XML,
  },
  {
    assessment_id: 'demo-item-free-response',
    type: AssessmentItemTypes.QTI,
    raw_data: FREE_RESPONSE_ITEM_XML,
  },
  {
    assessment_id: 'demo-item-blank',
    type: AssessmentItemTypes.QTI,
  },
];
