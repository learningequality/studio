import unittest

from contentcuration.utils.assessment.qti.catalog import Card
from contentcuration.utils.assessment.qti.catalog import Catalog
from contentcuration.utils.assessment.qti.catalog import CatalogInfo
from contentcuration.utils.assessment.qti.catalog import HtmlContent
from contentcuration.utils.assessment.qti.html import P


class CatalogElementXMLOutputTests(unittest.TestCase):
    def test_html_content_to_xml_string(self):
        html_content = HtmlContent(children=[P(children=["First hint."])])
        self.assertEqual(
            html_content.to_xml_string(),
            "<qti-html-content><p>First hint.</p></qti-html-content>",
        )

    def test_card_uses_kolibri_hint_support_by_default(self):
        card = Card(html_content=HtmlContent(children=[P(children=["Hint."])]))
        self.assertEqual(card.support, "ext:kolibri-hint")
        self.assertEqual(
            card.to_xml_string(),
            '<qti-card support="ext:kolibri-hint">'
            "<qti-html-content><p>Hint.</p></qti-html-content></qti-card>",
        )

    def test_catalog_to_xml_string(self):
        card = Card(html_content=HtmlContent(children=[P(children=["Hint."])]))
        catalog = Catalog(id_="kolibri-hints", card=[card])
        self.assertEqual(
            catalog.to_xml_string(),
            '<qti-catalog id="kolibri-hints"><qti-card support="ext:kolibri-hint">'
            "<qti-html-content><p>Hint.</p></qti-html-content>"
            "</qti-card></qti-catalog>",
        )

    def test_catalog_requires_at_least_one_card(self):
        with self.assertRaises(ValueError):
            Catalog(id_="kolibri-hints", card=[])

    def test_catalog_info_to_xml_string(self):
        card = Card(html_content=HtmlContent(children=[P(children=["Hint."])]))
        catalog_info = CatalogInfo(catalog=[Catalog(id_="kolibri-hints", card=[card])])
        self.assertEqual(
            catalog_info.to_xml_string(),
            "<qti-catalog-info>"
            '<qti-catalog id="kolibri-hints"><qti-card support="ext:kolibri-hint">'
            "<qti-html-content><p>Hint.</p></qti-html-content>"
            "</qti-card></qti-catalog></qti-catalog-info>",
        )

    def test_catalog_info_requires_at_least_one_catalog(self):
        with self.assertRaises(ValueError):
            CatalogInfo(catalog=[])
