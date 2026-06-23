/** QTI declaration XML fixtures shared across the QTIDeclaration test suite. */

export const SINGLE_SELECT_DECLARATION = `
<qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
  <qti-correct-response>
    <qti-value>ChoiceA</qti-value>
  </qti-correct-response>
</qti-response-declaration>
`.trim();

export const MULTI_SELECT_DECLARATION = `
<qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="multiple">
  <qti-correct-response>
    <qti-value>ChoiceA</qti-value>
    <qti-value>ChoiceC</qti-value>
  </qti-correct-response>
</qti-response-declaration>
`.trim();

export const DECLARATION_WITH_MAPPING = `
<qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
  <qti-correct-response>
    <qti-value>ChoiceA</qti-value>
  </qti-correct-response>
  <qti-mapping default-value="0" lower-bound="-1" upper-bound="2">
    <qti-map-entry map-key="ChoiceA" mapped-value="1"/>
    <qti-map-entry map-key="ChoiceB" mapped-value="-0.5" case-sensitive="false"/>
  </qti-mapping>
</qti-response-declaration>
`.trim();

export const OUTCOME_DECLARATION = `
<qti-outcome-declaration identifier="SCORE" base-type="float" cardinality="single"/>
`.trim();

export const NO_BASETYPE_DECLARATION = `
<qti-response-declaration identifier="RESPONSE" cardinality="single">
  <qti-correct-response>
    <qti-value>true</qti-value>
  </qti-correct-response>
</qti-response-declaration>
`.trim();
