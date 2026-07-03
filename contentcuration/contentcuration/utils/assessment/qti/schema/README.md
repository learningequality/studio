# Vendored QTI 3.0 schema

XSD files backing `contentcuration.utils.assessment.qti.validation`. Source: QTI 3.0.1
(IMS Global / 1EdTech), https://www.imsglobal.org/spec/qti/v3p0/impl.

- `xsd/imsqti_itemv3p0p1_v1p0.xsd` — the QTI-item-scoped schema (validates a single
  `qti-assessment-item` document; does not accept `qti-assessment-test`/`-section` roots).
  Source: https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_itemv3p0p1_v1p0.xsd
- `xsd/xml.xsd`, `xsd/XInclude.xsd` — W3C schemas for the `xml:` namespace and XInclude.
  Source: https://purl.imsglobal.org/spec/w3/2001/schema/xsd/{xml,XInclude}.xsd
- `xsd/mathml3*.xsd` — MathML 3 schema (content, presentation, common, strict-content).
  Source: https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/
- `xsd/ssmlv1p1-core.xsd`, `xsd/synthesis-nonamespace.xsd` — SSML 1.1 schema (QTI allows
  SSML markup for text-to-speech hints).
  Source: https://purl.imsglobal.org/spec/ssml/v1p1/schema/xsd/

All `schemaLocation` attributes that originally pointed at `https://purl.imsglobal.org/...`
have been rewritten to local relative filenames so the schema compiles with no network
access at runtime — required since bulk publish and ricecooker upload validate many items
per run. Do not restore the absolute URLs.

To refresh to a newer QTI point release, run `refresh_schema.py` (re-downloads each
file above and re-applies the `schemaLocation` rewrites), then re-run the full
`test_validation.py` suite:

```
python contentcuration/contentcuration/utils/assessment/qti/schema/refresh_schema.py
pytest contentcuration/contentcuration/tests/utils/qti/test_validation.py -v
```
