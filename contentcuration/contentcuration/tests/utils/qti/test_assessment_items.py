import unittest

from contentcuration.utils.assessment.qti.assessment_item import AssessmentItem
from contentcuration.utils.assessment.qti.assessment_item import CorrectResponse
from contentcuration.utils.assessment.qti.assessment_item import DefaultValue
from contentcuration.utils.assessment.qti.assessment_item import ItemBody
from contentcuration.utils.assessment.qti.assessment_item import MapEntry
from contentcuration.utils.assessment.qti.assessment_item import Mapping
from contentcuration.utils.assessment.qti.assessment_item import OutcomeDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseProcessing
from contentcuration.utils.assessment.qti.assessment_item import Value
from contentcuration.utils.assessment.qti.constants import BaseType
from contentcuration.utils.assessment.qti.constants import Cardinality
from contentcuration.utils.assessment.qti.html import Blockquote
from contentcuration.utils.assessment.qti.html import Br
from contentcuration.utils.assessment.qti.html import Div
from contentcuration.utils.assessment.qti.html import P
from contentcuration.utils.assessment.qti.html import Strong
from contentcuration.utils.assessment.qti.interaction_types.simple import (
    ChoiceInteraction,
)
from contentcuration.utils.assessment.qti.interaction_types.simple import SimpleChoice
from contentcuration.utils.assessment.qti.interaction_types.text_based import (
    ExtendedTextInteraction,
)
from contentcuration.utils.assessment.qti.interaction_types.text_based import (
    TextEntryInteraction,
)
from contentcuration.utils.assessment.qti.prompt import Prompt


class QTIAssessmentItemTests(unittest.TestCase):
    def test_true_false_question(self):
        expected_xml = """<qti-assessment-item
 xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0
 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
 identifier="beginnersguide007"
 title="BG true false example "
 adaptive="false"
 time-dependent="false"
 language="en-US"
 tool-name="kolibri"
 tool-version="0.1">
<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
<qti-correct-response>
<qti-value>true</qti-value>
</qti-correct-response>
</qti-response-declaration>
<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
<qti-default-value>
<qti-value>1</qti-value>
</qti-default-value>
</qti-outcome-declaration>
<qti-item-body>
<p>This is a True/False question?</p>
<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" min-choices="0" orientation="vertical">
<qti-simple-choice identifier="true" show-hide="show" fixed="false">True</qti-simple-choice>
<qti-simple-choice identifier="false" show-hide="show" fixed="false">False</qti-simple-choice>
</qti-choice-interaction>
</qti-item-body>
<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" /></qti-assessment-item>
""".replace(
            "\n", ""
        )

        # Construct the QTI elements
        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.IDENTIFIER,
            correct_response=CorrectResponse(value=[Value(value="true")]),
        )

        outcome_declaration = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
            default_value=DefaultValue(value=[Value(value="1")]),
        )

        true_choice = SimpleChoice(identifier="true", children=["True"])
        false_choice = SimpleChoice(identifier="false", children=["False"])
        choice_interaction = ChoiceInteraction(
            response_identifier="RESPONSE",
            max_choices=1,
            answers=[true_choice, false_choice],
        )

        item_body = ItemBody(
            children=[
                P(children=["This is a True/False question?"]),
                choice_interaction,
            ]
        )
        response_processing = ResponseProcessing(
            template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"
        )

        assessment_item = AssessmentItem(
            identifier="beginnersguide007",
            title="BG true false example ",
            language="EN-US",
            time_dependent=False,
            item_body=item_body,
            response_declaration=[response_declaration],
            outcome_declaration=[outcome_declaration],
            response_processing=response_processing,
        )

        # Generate the XML
        generated_xml = assessment_item.to_xml_string()

        # Compare the generated XML with the expected XML
        self.assertEqual(generated_xml.strip(), expected_xml.strip())

    def test_multiple_choice_question(self):
        expected_xml = """<qti-assessment-item
 xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
 identifier="beginnersguide008"
 title="BG Choice example"
 adaptive="false"
 time-dependent="false"
 language="en-US"
 tool-name="kolibri"
 tool-version="0.1">
<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
<qti-correct-response>
<qti-value>A</qti-value>
<qti-value>C</qti-value>
<qti-value>D</qti-value>
</qti-correct-response>
</qti-response-declaration>
<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
<qti-default-value>
<qti-value>1</qti-value>
</qti-default-value>
</qti-outcome-declaration>
<qti-item-body>
<p>QTI 3 is a new version released in 2022.</p>
<qti-choice-interaction response-identifier="RESPONSE" max-choices="3" min-choices="0" orientation="vertical">
<qti-prompt>
<p>Which of the following features are <strong>new</strong> to QTI 3?</p>
<p>Pick 3 choices.</p>
</qti-prompt>
<qti-simple-choice identifier="A" show-hide="show" fixed="false">Shared Vocabulary</qti-simple-choice>
<qti-simple-choice identifier="B" show-hide="show" fixed="false">Pineapple Flavored</qti-simple-choice>
<qti-simple-choice identifier="C" show-hide="show" fixed="false">Catalogs for candidate-specific content.</qti-simple-choice>
<qti-simple-choice identifier="D" show-hide="show" fixed="false">Conformance features definitions</qti-simple-choice>
<qti-simple-choice identifier="E" show-hide="show" fixed="false">A subset of HTML5 elements</qti-simple-choice>
</qti-choice-interaction>
</qti-item-body>
<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>""".replace(
            "\n", ""
        )
        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.MULTIPLE,
            base_type=BaseType.IDENTIFIER,
            correct_response=CorrectResponse(
                value=[
                    Value(value="A"),
                    Value(value="C"),
                    Value(value="D"),
                ]
            ),
        )

        outcome_declaration = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
            default_value=DefaultValue(value=[Value(value="1")]),
        )

        prompt = Prompt(
            children=[
                P(
                    children=[
                        "Which of the following features are ",
                        Strong(children=["new"]),
                        " to QTI 3?",
                    ]
                ),
                P(children=["Pick 3 choices."]),
            ]
        )
        choice_a = SimpleChoice(identifier="A", children=["Shared Vocabulary"])
        choice_b = SimpleChoice(identifier="B", children=["Pineapple Flavored"])
        choice_c = SimpleChoice(
            identifier="C",
            children=["Catalogs for candidate-specific content."],
        )
        choice_d = SimpleChoice(
            identifier="D", children=["Conformance features definitions"]
        )
        choice_e = SimpleChoice(identifier="E", children=["A subset of HTML5 elements"])
        choice_interaction = ChoiceInteraction(
            response_identifier="RESPONSE",
            max_choices=3,
            answers=[choice_a, choice_b, choice_c, choice_d, choice_e],
            prompt=prompt,
        )

        item_body = ItemBody(
            children=[
                P(children=["QTI 3 is a new version released in 2022."]),
                choice_interaction,
            ]
        )
        response_processing = ResponseProcessing(
            template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"
        )

        assessment_item = AssessmentItem(
            identifier="beginnersguide008",
            title="BG Choice example",
            language="EN-US",
            time_dependent=False,
            item_body=item_body,
            response_declaration=[response_declaration],
            outcome_declaration=[outcome_declaration],
            response_processing=response_processing,
        )

        generated_xml = assessment_item.to_xml_string()
        self.assertEqual(generated_xml.strip(), expected_xml.strip())

    def test_long_text_question(self):
        expected_xml = """<qti-assessment-item
 xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
 identifier="beginnersguide009"
 title="BG Postcard example"
 adaptive="false"
 time-dependent="false"
 language="en-US"
 tool-name="kolibri"
 tool-version="0.1">
<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string" />
<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
<qti-item-body>
<p>Read this postcard from your English pen-friend, Sam.</p>
<div>
<blockquote class="postcard">
<p>Here is a postcard of my town. Please send me<br />
a postcard from your town. What size is your Town?<br />
What is the nicest part of your town?<br />
Where do you go in the evenings?</p>
<p>Sam</p>
</blockquote>
</div>
<qti-extended-text-interaction response-identifier="RESPONSE" min-strings="0" format="plain">
<qti-prompt>Write Sam a postcard. Answer the questions. Write 23–30 words</qti-prompt>
</qti-extended-text-interaction>
</qti-item-body>
</qti-assessment-item>""".replace(
            "\n", ""
        )
        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.STRING,
        )

        outcome_declaration = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
        )

        prompt_text = "Write Sam a postcard. Answer the questions. Write 23–30 words"

        extended_text_interaction = ExtendedTextInteraction(
            response_identifier="RESPONSE",
            prompt=Prompt(children=[prompt_text]),
        )

        item_body = ItemBody(
            children=[
                P(children=["Read this postcard from your English pen-friend, Sam."]),
                Div(
                    children=[
                        Blockquote(
                            class_="postcard",
                            children=[
                                P(
                                    children=[
                                        "Here is a postcard of my town. Please send me",
                                        Br(),
                                        "a postcard from your town. What size is your Town?",
                                        Br(),
                                        "What is the nicest part of your town?",
                                        Br(),
                                        "Where do you go in the evenings?",
                                    ]
                                ),
                                P(children=["Sam"]),
                            ],
                        )
                    ]
                ),
                extended_text_interaction,
            ]
        )

        assessment_item = AssessmentItem(
            identifier="beginnersguide009",
            title="BG Postcard example",
            language="en-US",
            time_dependent=False,
            item_body=item_body,
            response_declaration=[response_declaration],
            outcome_declaration=[outcome_declaration],
        )

        generated_xml = assessment_item.to_xml_string()
        self.assertEqual(generated_xml.strip(), expected_xml.strip())

    def test_missing_word_question(self):
        expected_xml = """<qti-assessment-item
 xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
 identifier="beginnersguide010"
 title="BG Missing Word example"
 adaptive="false"
 time-dependent="false"
 language="en-US"
 tool-name="kolibri"
 tool-version="0.1">
<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
<qti-correct-response>
<qti-value>York</qti-value>
</qti-correct-response>
<qti-mapping default-value="0.0">
<qti-map-entry map-key="York" mapped-value="1.0" case-sensitive="true" />
<qti-map-entry map-key="york" mapped-value="0.5" case-sensitive="false" />
</qti-mapping>
</qti-response-declaration>
<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
<qti-item-body>
<p>Identify the missing word in this famous quote from Shakespeare's Richard III.</p>
<div>
<blockquote class="postcard">
<p>Now is the winter of our discontent<br />
Made glorious summer by this sun of <qti-text-entry-interaction response-identifier="RESPONSE" />;
<br />
And all the clouds that lour'd upon our house<br />
In the deep bosom of the ocean buried.</p>
</blockquote>
</div>
</qti-item-body>
<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response" />
</qti-assessment-item>""".replace(
            "\n", ""
        )

        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.STRING,
            correct_response=CorrectResponse(value=[Value(value="York")]),
            mapping=Mapping(
                default_value=0,
                map_entries=[
                    MapEntry(map_key="York", mapped_value=1, case_sensitive=True),
                    MapEntry(map_key="york", mapped_value=0.5),
                ],
            ),
        )

        outcome_declaration = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
        )

        text_entry_interaction = TextEntryInteraction(response_identifier="RESPONSE")

        item_body = ItemBody(
            children=[
                P(
                    children=[
                        "Identify the missing word in this famous quote from Shakespeare's Richard III."
                    ]
                ),
                Div(
                    children=[
                        Blockquote(
                            class_="postcard",
                            children=[
                                P(
                                    children=[
                                        "Now is the winter of our discontent",
                                        Br(),
                                        "Made glorious summer by this sun of ",
                                        text_entry_interaction,
                                        ";",
                                        Br(),
                                        "And all the clouds that lour'd upon our house",
                                        Br(),
                                        "In the deep bosom of the ocean buried.",
                                    ]
                                ),
                            ],
                        )
                    ]
                ),
            ]
        )

        response_processing = ResponseProcessing(
            template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response"
        )

        assessment_item = AssessmentItem(
            identifier="beginnersguide010",
            title="BG Missing Word example",
            language="en-US",
            time_dependent=False,
            item_body=item_body,
            response_declaration=[response_declaration],
            outcome_declaration=[outcome_declaration],
            response_processing=response_processing,
        )

        generated_xml = assessment_item.to_xml_string()
        self.assertEqual(generated_xml.strip(), expected_xml.strip())

    def test_numerical_entry_question(self):
        expected_xml = """<qti-assessment-item
 xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
 identifier="numerical-entry-item"
 title="Numerical Entry Question"
 adaptive="false"
 time-dependent="false"
 language="en-US"
 tool-name="kolibri"
 tool-version="0.1">
<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
<qti-correct-response>
<qti-value>42.5</qti-value>
</qti-correct-response>
</qti-response-declaration>
<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
<qti-default-value>
<qti-value>0.0</qti-value>
</qti-default-value>
</qti-outcome-declaration>
<qti-item-body>
<p>Calculate the value of x when 2x + 5 = 90:</p>
<p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="10" pattern-mask="^[0-9]*\\.?[0-9]+$" placeholder-text="Enter a number" /></p>
</qti-item-body>
</qti-assessment-item>""".replace(
            "\n", ""
        )

        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
            correct_response=CorrectResponse(value=[Value(value="42.5")]),
        )

        outcome_declaration = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
            default_value=DefaultValue(value=[Value(value="0.0")]),
        )

        text_entry_interaction = TextEntryInteraction(
            response_identifier="RESPONSE",
            expected_length=10,
            pattern_mask="^[0-9]*\\.?[0-9]+$",
            placeholder_text="Enter a number",
        )

        assessment_item = AssessmentItem(
            identifier="numerical-entry-item",
            title="Numerical Entry Question",
            language="en-US",
            time_dependent=False,
            item_body=ItemBody(
                children=[
                    P(children=["Calculate the value of x when 2x + 5 = 90:"]),
                    P(children=[text_entry_interaction]),
                ]
            ),
            response_declaration=[response_declaration],
            outcome_declaration=[outcome_declaration],
        )

        generated_xml = assessment_item.to_xml_string()
        self.assertEqual(generated_xml.strip(), expected_xml.strip())
