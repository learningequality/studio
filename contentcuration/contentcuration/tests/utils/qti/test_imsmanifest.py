import unittest

from contentcuration.utils.assessment.qti.imsmanifest import Dependency
from contentcuration.utils.assessment.qti.imsmanifest import File
from contentcuration.utils.assessment.qti.imsmanifest import Item
from contentcuration.utils.assessment.qti.imsmanifest import Manifest
from contentcuration.utils.assessment.qti.imsmanifest import Metadata
from contentcuration.utils.assessment.qti.imsmanifest import Organization
from contentcuration.utils.assessment.qti.imsmanifest import Organizations
from contentcuration.utils.assessment.qti.imsmanifest import Resource
from contentcuration.utils.assessment.qti.imsmanifest import Resources


class TestManifestXMLOutput(unittest.TestCase):
    def test_metadata_to_xml_string(self):
        metadata = Metadata(schema="test_schema", schemaversion="1.0")
        expected_xml = "<metadata><schema>test_schema</schema><schemaversion>1.0</schemaversion></metadata>"
        self.assertEqual(metadata.to_xml_string(), expected_xml)

        metadata = Metadata()
        expected_xml = "<metadata />"
        self.assertEqual(metadata.to_xml_string(), expected_xml)

    def test_item_to_xml_string(self):
        item = Item(identifier="item1", identifierref="ref1")
        expected_xml = '<item identifier="item1" identifierref="ref1" />'
        self.assertEqual(item.to_xml_string(), expected_xml)

        item = Item()
        expected_xml = "<item />"
        self.assertEqual(item.to_xml_string(), expected_xml)

    def test_organization_to_xml_string(self):
        item1 = Item(identifier="item1")
        item2 = Item(identifier="item2")
        organization = Organization(
            identifier="org1",
            structure="hierarchical",
            title="Test Org",
            item=[item1, item2],
        )
        expected_xml = '<organization identifier="org1" structure="hierarchical" title="Test Org"><item identifier="item1" /><item identifier="item2" /></organization>'  # noqa: E501
        self.assertEqual(organization.to_xml_string(), expected_xml)

        organization = Organization()
        expected_xml = "<organization />"
        self.assertEqual(organization.to_xml_string(), expected_xml)

    def test_organizations_to_xml_string(self):
        org1 = Organization(identifier="org1")
        org2 = Organization(identifier="org2")
        organizations = Organizations(organizations=[org1, org2])
        expected_xml = '<organizations><organization identifier="org1" /><organization identifier="org2" /></organizations>'
        self.assertEqual(organizations.to_xml_string(), expected_xml)
        organizations = Organizations()
        expected_xml = "<organizations />"
        self.assertEqual(organizations.to_xml_string(), expected_xml)

    def test_file_to_xml_string(self):
        file = File(href="test.html")
        expected_xml = '<file href="test.html" />'
        self.assertEqual(file.to_xml_string(), expected_xml)
        file = File()
        expected_xml = "<file />"
        self.assertEqual(file.to_xml_string(), expected_xml)

    def test_resource_to_xml_string(self):
        file1 = File(href="file1.html")
        file2 = File(href="file2.html")
        resource = Resource(
            identifier="res1", type_="webcontent", href="res.zip", files=[file1, file2]
        )
        expected_xml = '<resource identifier="res1" type="webcontent" href="res.zip"><file href="file1.html" /><file href="file2.html" /></resource>'
        self.assertEqual(resource.to_xml_string(), expected_xml)

        resource = Resource(identifier="res1", type_="webcontent")
        expected_xml = '<resource identifier="res1" type="webcontent" />'
        self.assertEqual(resource.to_xml_string(), expected_xml)

    def test_resources_to_xml_string(self):
        res1 = Resource(identifier="res1", type_="webcontent")
        res2 = Resource(identifier="res2", type_="imscp")
        resources = Resources(resources=[res1, res2])
        expected_xml = '<resources><resource identifier="res1" type="webcontent" /><resource identifier="res2" type="imscp" /></resources>'
        self.assertEqual(resources.to_xml_string(), expected_xml)
        resources = Resources()
        expected_xml = "<resources />"
        self.assertEqual(resources.to_xml_string(), expected_xml)

    def test_imsmanifest_to_xml_string(self):
        metadata = Metadata(schema="test_schema", schemaversion="1.0")
        organizations = Organizations(organizations=[Organization(identifier="org1")])
        resources = Resources(
            resources=[Resource(identifier="res1", type_="webcontent")]
        )
        manifest = Manifest(
            identifier="manifest1",
            version="1.0",
            metadata=metadata,
            organizations=organizations,
            resources=resources,
        )
        expected_xml = (
            "<manifest "
            'xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" '
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            'xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" identifier="manifest1" version="1.0">'  # noqa: E501
            "<metadata><schema>test_schema</schema><schemaversion>1.0</schemaversion></metadata>"
            '<organizations><organization identifier="org1" /></organizations>'
            '<resources><resource identifier="res1" type="webcontent" /></resources>'
            "</manifest>"
        )
        self.assertEqual(manifest.to_xml_string(), expected_xml)

        manifest = Manifest(identifier="democracy_manifest")
        expected_xml = (
            '<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" '
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            'xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" '  # noqa: E501
            'identifier="democracy_manifest">'
            "<metadata />"
            "<organizations />"
            "<resources />"
            "</manifest>"
        )
        self.assertEqual(manifest.to_xml_string(), expected_xml)

    def test_imsmanifest_full_integration(self):
        manifest = Manifest(
            identifier="level1-T1-test-entry",
            version="1.0",
            metadata=Metadata(schema="QTI Package", schemaversion="3.0.0"),
            organizations=Organizations(),
            resources=Resources(
                resources=[
                    Resource(
                        identifier="t1-test-entry-item1",
                        type_="imsqti_item_xmlv3p0",
                        href="items/choice-single-cardinality.xml",
                        files=[File(href="items/choice-single-cardinality.xml")],
                        dependencies=[Dependency(identifierref="image_resource_1")],
                    ),
                    Resource(
                        type_="webcontent",
                        identifier="image_resource_1",
                        href="items/images/badger.svg",
                        files=[File(href="items/images/badger.svg")],
                    ),
                    Resource(
                        identifier="t1-test-entry-item2",
                        type_="imsqti_item_xmlv3p0",
                        href="items/choice-multiple-cardinality.xml",
                        files=[File(href="items/choice-multiple-cardinality.xml")],
                    ),
                    Resource(
                        identifier="t1-test-entry-item3",
                        type_="imsqti_item_xmlv3p0",
                        href="items/text-entry.xml",
                        files=[File(href="items/text-entry.xml")],
                    ),
                    Resource(
                        identifier="t1-test-entry-item4",
                        type_="imsqti_item_xmlv3p0",
                        href="items/extended-text.xml",
                        files=[File(href="items/extended-text.xml")],
                    ),
                    Resource(
                        identifier="t1-test-entry",
                        type_="imsqti_test_xmlv3p0",
                        href="assessment.xml",
                        files=[File(href="assessment.xml")],
                    ),
                ]
            ),
        )

        expected_xml = (
            '<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" identifier="level1-T1-test-entry" version="1.0">'  # noqa: E501
            "<metadata><schema>QTI Package</schema><schemaversion>3.0.0</schemaversion></metadata>"
            "<organizations />"
            "<resources>"
            '<resource identifier="t1-test-entry-item1" type="imsqti_item_xmlv3p0" href="items/choice-single-cardinality.xml">'
            '<file href="items/choice-single-cardinality.xml" />'
            '<dependency identifierref="image_resource_1" />'
            "</resource>"
            '<resource identifier="image_resource_1" type="webcontent" href="items/images/badger.svg">'
            '<file href="items/images/badger.svg" />'
            "</resource>"
            '<resource identifier="t1-test-entry-item2" type="imsqti_item_xmlv3p0" href="items/choice-multiple-cardinality.xml">'
            '<file href="items/choice-multiple-cardinality.xml" />'
            "</resource>"
            '<resource identifier="t1-test-entry-item3" type="imsqti_item_xmlv3p0" href="items/text-entry.xml">'
            '<file href="items/text-entry.xml" />'
            "</resource>"
            '<resource identifier="t1-test-entry-item4" type="imsqti_item_xmlv3p0" href="items/extended-text.xml">'
            '<file href="items/extended-text.xml" />'
            "</resource>"
            '<resource identifier="t1-test-entry" type="imsqti_test_xmlv3p0" href="assessment.xml">'
            '<file href="assessment.xml" />'
            "</resource>"
            "</resources>"
            "</manifest>"
        )
        self.assertEqual(manifest.to_xml_string(), expected_xml)
