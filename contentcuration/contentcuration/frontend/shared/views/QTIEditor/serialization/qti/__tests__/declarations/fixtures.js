/** QTI XML fixtures shared across the Mapping and AreaMapping test suites. */

export const SIMPLE_MAPPING_XML = `
<qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
  <qti-mapping default-value="0">
    <qti-map-entry map-key="ChoiceA" mapped-value="1"/>
    <qti-map-entry map-key="ChoiceB" mapped-value="-0.5"/>
  </qti-mapping>
</qti-response-declaration>
`.trim();

export const MAPPING_WITH_BOUNDS_XML = `
<qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
  <qti-mapping default-value="-1" lower-bound="-2" upper-bound="5">
    <qti-map-entry map-key="A" mapped-value="2"/>
  </qti-mapping>
</qti-response-declaration>
`.trim();

export const MAPPING_WITH_CI_XML = `
<qti-response-declaration identifier="RESPONSE" base-type="string" cardinality="single">
  <qti-mapping default-value="0">
    <qti-map-entry map-key="hello" mapped-value="1" case-sensitive="false"/>
    <qti-map-entry map-key="world" mapped-value="1"/>
  </qti-mapping>
</qti-response-declaration>
`.trim();

export const AREA_MAPPING_XML = `
<qti-response-declaration identifier="RESPONSE" base-type="point" cardinality="single">
  <qti-area-mapping default-value="0">
    <qti-area-map-entry shape="circle" coords="100,100,50" mapped-value="1"/>
    <qti-area-map-entry shape="rect" coords="0,0,200,200" mapped-value="0.5"/>
  </qti-area-mapping>
</qti-response-declaration>
`.trim();

export const AREA_MAPPING_WITH_BOUNDS_XML = `
<qti-response-declaration identifier="RESPONSE" base-type="point" cardinality="single">
  <qti-area-mapping default-value="-1" lower-bound="-2" upper-bound="3">
    <qti-area-map-entry shape="poly" coords="10,10,50,10,50,50" mapped-value="2"/>
  </qti-area-mapping>
</qti-response-declaration>
`.trim();
