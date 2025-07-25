import unittest

from contentcuration.utils.assessment.qti.base import TextNode
from contentcuration.utils.assessment.qti.html import A
from contentcuration.utils.assessment.qti.html import Abbr
from contentcuration.utils.assessment.qti.html import Address
from contentcuration.utils.assessment.qti.html import Article
from contentcuration.utils.assessment.qti.html import Aside
from contentcuration.utils.assessment.qti.html import Audio
from contentcuration.utils.assessment.qti.html import B
from contentcuration.utils.assessment.qti.html import Bdi
from contentcuration.utils.assessment.qti.html import Bdo
from contentcuration.utils.assessment.qti.html import BdoDir
from contentcuration.utils.assessment.qti.html import Blockquote
from contentcuration.utils.assessment.qti.html import Br
from contentcuration.utils.assessment.qti.html import Caption
from contentcuration.utils.assessment.qti.html import Cite
from contentcuration.utils.assessment.qti.html import Code
from contentcuration.utils.assessment.qti.html import Col
from contentcuration.utils.assessment.qti.html import Colgroup
from contentcuration.utils.assessment.qti.html import Dd
from contentcuration.utils.assessment.qti.html import Details
from contentcuration.utils.assessment.qti.html import Dfn
from contentcuration.utils.assessment.qti.html import Div
from contentcuration.utils.assessment.qti.html import Dl
from contentcuration.utils.assessment.qti.html import Dt
from contentcuration.utils.assessment.qti.html import Em
from contentcuration.utils.assessment.qti.html import Figcaption
from contentcuration.utils.assessment.qti.html import Figure
from contentcuration.utils.assessment.qti.html import Footer
from contentcuration.utils.assessment.qti.html import H1
from contentcuration.utils.assessment.qti.html import H2
from contentcuration.utils.assessment.qti.html import H3
from contentcuration.utils.assessment.qti.html import H4
from contentcuration.utils.assessment.qti.html import H5
from contentcuration.utils.assessment.qti.html import H6
from contentcuration.utils.assessment.qti.html import Header
from contentcuration.utils.assessment.qti.html import Hr
from contentcuration.utils.assessment.qti.html import HTMLElement
from contentcuration.utils.assessment.qti.html import I
from contentcuration.utils.assessment.qti.html import Img
from contentcuration.utils.assessment.qti.html import Kbd
from contentcuration.utils.assessment.qti.html import Label
from contentcuration.utils.assessment.qti.html import Li
from contentcuration.utils.assessment.qti.html import Nav
from contentcuration.utils.assessment.qti.html import Object
from contentcuration.utils.assessment.qti.html import Ol
from contentcuration.utils.assessment.qti.html import OlType
from contentcuration.utils.assessment.qti.html import P
from contentcuration.utils.assessment.qti.html import Param
from contentcuration.utils.assessment.qti.html import Picture
from contentcuration.utils.assessment.qti.html import Pre
from contentcuration.utils.assessment.qti.html import Q
from contentcuration.utils.assessment.qti.html import Rp
from contentcuration.utils.assessment.qti.html import Rt
from contentcuration.utils.assessment.qti.html import Ruby
from contentcuration.utils.assessment.qti.html import Samp
from contentcuration.utils.assessment.qti.html import Section
from contentcuration.utils.assessment.qti.html import Small
from contentcuration.utils.assessment.qti.html import Source
from contentcuration.utils.assessment.qti.html import Span
from contentcuration.utils.assessment.qti.html import Strong
from contentcuration.utils.assessment.qti.html import Sub
from contentcuration.utils.assessment.qti.html import Summary
from contentcuration.utils.assessment.qti.html import Sup
from contentcuration.utils.assessment.qti.html import Table
from contentcuration.utils.assessment.qti.html import TBody
from contentcuration.utils.assessment.qti.html import Td
from contentcuration.utils.assessment.qti.html import TFoot
from contentcuration.utils.assessment.qti.html import Th
from contentcuration.utils.assessment.qti.html import THead
from contentcuration.utils.assessment.qti.html import Tr
from contentcuration.utils.assessment.qti.html import Track
from contentcuration.utils.assessment.qti.html import TrackKind
from contentcuration.utils.assessment.qti.html import Ul
from contentcuration.utils.assessment.qti.html import Var
from contentcuration.utils.assessment.qti.html import Video


class HTMLDataClassTests(unittest.TestCase):
    def test_break_elements(self):
        br_element = Br()
        self.assertEqual(br_element.to_xml_string(), "<br />")

        hr_element = Hr()
        self.assertEqual(hr_element.to_xml_string(), "<hr />")

    def test_display_elements(self):
        label_element = Label(children=["Test Label"], for_="test")
        self.assertEqual(
            label_element.to_xml_string(), '<label for="test">Test Label</label>'
        )

        summary_element = Summary(children=["Test Summary"])
        self.assertEqual(
            summary_element.to_xml_string(), "<summary>Test Summary</summary>"
        )

        figcaption_element = Figcaption(children=["Test Figcaption"])
        self.assertEqual(
            figcaption_element.to_xml_string(),
            "<figcaption>Test Figcaption</figcaption>",
        )

    def test_details_validation(self):
        summary_element = Summary(children=["Test Summary"])

        # Valid case: Summary as first child
        valid_details = Details(children=[summary_element, "Test Content"])
        self.assertEqual(
            valid_details.to_xml_string(),
            "<details><summary>Test Summary</summary>Test Content</details>",
        )

        # Invalid case: No Summary element
        with self.assertRaises(ValueError):
            Details(children=["Test Content"])

        # Invalid case: Summary not as first child
        with self.assertRaises(ValueError):
            Details(children=["Test Content", summary_element])

        # Invalid case: Multiple Summary elements
        second_summary = Summary(children=["Second Summary"])
        with self.assertRaises(ValueError):
            Details(children=[summary_element, "Test Content", second_summary])

    def test_figure_elements(self):
        figure_element = Figure(children=["Test Figure"])
        self.assertEqual(figure_element.to_xml_string(), "<figure>Test Figure</figure>")

        figcaption_element = Figcaption(children=["Test Caption"])
        figure_with_caption = Figure(children=[figcaption_element, "Test Content"])
        self.assertEqual(
            figure_with_caption.to_xml_string(),
            "<figure><figcaption>Test Caption</figcaption>Test Content</figure>",
        )

        figure_with_caption_last = Figure(children=["Test Content", figcaption_element])
        self.assertEqual(
            figure_with_caption_last.to_xml_string(),
            "<figure>Test Content<figcaption>Test Caption</figcaption></figure>",
        )

        with self.assertRaises(ValueError):
            Figure(
                children=[figcaption_element, Figcaption(children=["Second Caption"])]
            )

        with self.assertRaises(ValueError):
            Figure(children=["Before", figcaption_element, "After"])

    def test_embed_elements(self):
        img_element = Img(alt="Test Alt", src="test.jpg")
        self.assertEqual(
            img_element.to_xml_string(), '<img alt="Test Alt" src="test.jpg" />'
        )

        param_element = Param(name="test_param", value="test_value")
        self.assertEqual(
            param_element.to_xml_string(),
            '<param name="test_param" value="test_value" />',
        )

        object_element = Object(children=["Test Object"], params=[param_element])
        self.assertEqual(
            object_element.to_xml_string(),
            '<object><param name="test_param" value="test_value" />Test Object</object>',
        )

        picture_source_element = Source(srcset="test.jpg 2x")
        self.assertEqual(
            picture_source_element.to_xml_string(), '<source srcset="test.jpg 2x" />'
        )

        picture_element = Picture(children=[picture_source_element], img=img_element)
        self.assertEqual(
            picture_element.to_xml_string(),
            '<picture><source srcset="test.jpg 2x" /><img alt="Test Alt" src="test.jpg" /></picture>',
        )

    def test_flow_elements(self):
        blockquote_element = Blockquote(
            children=["Test Blockquote"], cite="http://test.com"
        )
        self.assertEqual(
            blockquote_element.to_xml_string(),
            '<blockquote cite="http://test.com/">Test Blockquote</blockquote>',
        )

        div_element = Div(children=["Test Div"])
        self.assertEqual(div_element.to_xml_string(), "<div>Test Div</div>")

        article_element = Article(children=["Test Article"])
        self.assertEqual(
            article_element.to_xml_string(), "<article>Test Article</article>"
        )

        section_element = Section(children=["Test Section"])
        self.assertEqual(
            section_element.to_xml_string(), "<section>Test Section</section>"
        )

        nav_element = Nav(children=["Test Nav"])
        self.assertEqual(nav_element.to_xml_string(), "<nav>Test Nav</nav>")

        aside_element = Aside(children=["Test Aside"])
        self.assertEqual(aside_element.to_xml_string(), "<aside>Test Aside</aside>")

        header_element = Header(children=["Test Header"])
        self.assertEqual(header_element.to_xml_string(), "<header>Test Header</header>")

        footer_element = Footer(children=["Test Footer"])
        self.assertEqual(footer_element.to_xml_string(), "<footer>Test Footer</footer>")

        address_element = Address(children=["Test Address"])
        self.assertEqual(
            address_element.to_xml_string(), "<address>Test Address</address>"
        )

    def test_media_elements(self):
        track_element = Track(src="test.vtt", kind=TrackKind.SUBTITLES)
        self.assertEqual(
            track_element.to_xml_string(), '<track src="test.vtt" kind="subtitles" />'
        )

        media_source_element = Source(src="test.mp4")
        self.assertEqual(
            media_source_element.to_xml_string(), '<source src="test.mp4" />'
        )

        audio_element = Audio(children=["Test Audio"], src="test.mp3")
        self.assertEqual(
            audio_element.to_xml_string(),
            '<audio src="test.mp3" preload="metadata">Test Audio</audio>',
        )

        video_element = Video(children=["Test Video"], src="test.mp4")
        self.assertEqual(
            video_element.to_xml_string(),
            '<video src="test.mp4" preload="metadata">Test Video</video>',
        )

    def test_sequence_elements(self):
        li_element = Li(children=["Test Li"])
        self.assertEqual(li_element.to_xml_string(), "<li>Test Li</li>")

        ol_element = Ol(children=[li_element], type=OlType.NUMBERS)
        self.assertEqual(
            ol_element.to_xml_string(), '<ol type="1"><li>Test Li</li></ol>'
        )

        ul_element = Ul(children=[li_element])
        self.assertEqual(ul_element.to_xml_string(), "<ul><li>Test Li</li></ul>")

        dt_element = Dt(children=["Test Dt"])
        self.assertEqual(dt_element.to_xml_string(), "<dt>Test Dt</dt>")

        dd_element = Dd(children=["Test Dd"])
        self.assertEqual(dd_element.to_xml_string(), "<dd>Test Dd</dd>")

        dl_element = Dl(children=[dt_element, dd_element])
        self.assertEqual(
            dl_element.to_xml_string(), "<dl><dt>Test Dt</dt><dd>Test Dd</dd></dl>"
        )

    def test_table_elements(self):
        caption_element = Caption(children=["Test Caption"])
        self.assertEqual(
            caption_element.to_xml_string(), "<caption>Test Caption</caption>"
        )

        col_element = Col()
        self.assertEqual(col_element.to_xml_string(), '<col span="1" />')

        colgroup_element = Colgroup(children=[col_element])
        self.assertEqual(
            colgroup_element.to_xml_string(), '<colgroup><col span="1" /></colgroup>'
        )

        td_element = Td(children=["Test Td"])
        self.assertEqual(td_element.to_xml_string(), "<td>Test Td</td>")

        th_element = Th(children=["Test Th"])
        self.assertEqual(th_element.to_xml_string(), "<th>Test Th</th>")

        tr_element = Tr(children=[th_element, td_element])
        self.assertEqual(
            tr_element.to_xml_string(), "<tr><th>Test Th</th><td>Test Td</td></tr>"
        )

        tbody_element = TBody(children=[tr_element])
        self.assertEqual(
            tbody_element.to_xml_string(),
            "<tbody><tr><th>Test Th</th><td>Test Td</td></tr></tbody>",
        )

        thead_element = THead(children=[tr_element])
        self.assertEqual(
            thead_element.to_xml_string(),
            "<thead><tr><th>Test Th</th><td>Test Td</td></tr></thead>",
        )

        tfoot_element = TFoot(children=[tr_element])
        self.assertEqual(
            tfoot_element.to_xml_string(),
            "<tfoot><tr><th>Test Th</th><td>Test Td</td></tr></tfoot>",
        )

        table_element = Table(
            children=[
                caption_element,
                colgroup_element,
                thead_element,
                tbody_element,
                tfoot_element,
            ]
        )
        expected_html = '<table><caption>Test Caption</caption><colgroup><col span="1" /></colgroup><thead><tr><th>Test Th</th><td>Test Td</td></tr></thead><tbody><tr><th>Test Th</th><td>Test Td</td></tr></tbody><tfoot><tr><th>Test Th</th><td>Test Td</td></tr></tfoot></table>'  # noqa: E501
        self.assertEqual(table_element.to_xml_string(), expected_html)

    def test_text_elements(self):
        a_element = A(children=["Test A"], href="file.html")
        self.assertEqual(a_element.to_xml_string(), '<a href="file.html">Test A</a>')

        p_element = P(children=["Test P"])
        self.assertEqual(p_element.to_xml_string(), "<p>Test P</p>")

        span_element = Span(children=["Test Span"])
        self.assertEqual(span_element.to_xml_string(), "<span>Test Span</span>")

        h1_element = H1(children=["Test H1"])
        self.assertEqual(h1_element.to_xml_string(), "<h1>Test H1</h1>")

        h2_element = H2(children=["Test H2"])
        self.assertEqual(h2_element.to_xml_string(), "<h2>Test H2</h2>")

        h3_element = H3(children=["Test H3"])
        self.assertEqual(h3_element.to_xml_string(), "<h3>Test H3</h3>")

        h4_element = H4(children=["Test H4"])
        self.assertEqual(h4_element.to_xml_string(), "<h4>Test H4</h4>")

        h5_element = H5(children=["Test H5"])
        self.assertEqual(h5_element.to_xml_string(), "<h5>Test H5</h5>")

        h6_element = H6(children=["Test H6"])
        self.assertEqual(h6_element.to_xml_string(), "<h6>Test H6</h6>")

        pre_element = Pre(children=["Test Pre"])
        self.assertEqual(pre_element.to_xml_string(), "<pre>Test Pre</pre>")

        em_element = Em(children=["Test Em"])
        self.assertEqual(em_element.to_xml_string(), "<em>Test Em</em>")

        code_element = Code(children=["Test Code"])
        self.assertEqual(code_element.to_xml_string(), "<code>Test Code</code>")

        kbd_element = Kbd(children=["Test Kbd"])
        self.assertEqual(kbd_element.to_xml_string(), "<kbd>Test Kbd</kbd>")

        i_element = I(children=["Test I"])
        self.assertEqual(i_element.to_xml_string(), "<i>Test I</i>")

        dfn_element = Dfn(children=["Test Dfn"])
        self.assertEqual(dfn_element.to_xml_string(), "<dfn>Test Dfn</dfn>")

        abbr_element = Abbr(children=["Test Abbr"])
        self.assertEqual(abbr_element.to_xml_string(), "<abbr>Test Abbr</abbr>")

        strong_element = Strong(children=["Test Strong"])
        self.assertEqual(strong_element.to_xml_string(), "<strong>Test Strong</strong>")

        sup_element = Sup(children=["Test Sup"])
        self.assertEqual(sup_element.to_xml_string(), "<sup>Test Sup</sup>")

        sub_element = Sub(children=["Test Sub"])
        self.assertEqual(sub_element.to_xml_string(), "<sub>Test Sub</sub>")

        var_element = Var(children=["Test Var"])
        self.assertEqual(var_element.to_xml_string(), "<var>Test Var</var>")

        small_element = Small(children=["Test Small"])
        self.assertEqual(small_element.to_xml_string(), "<small>Test Small</small>")

        samp_element = Samp(children=["Test Samp"])
        self.assertEqual(samp_element.to_xml_string(), "<samp>Test Samp</samp>")

        b_element = B(children=["Test B"])
        self.assertEqual(b_element.to_xml_string(), "<b>Test B</b>")

        cite_element = Cite(children=["Test Cite"])
        self.assertEqual(cite_element.to_xml_string(), "<cite>Test Cite</cite>")

        q_element = Q(children=["Test Q"])
        self.assertEqual(q_element.to_xml_string(), "<q>Test Q</q>")

        bdo_element = Bdo(dir=BdoDir.LTR, children=["Test Bdo"])
        self.assertEqual(bdo_element.to_xml_string(), '<bdo dir="ltr">Test Bdo</bdo>')

        bdi_element = Bdi(children=["Test Bdi"])
        self.assertEqual(bdi_element.to_xml_string(), "<bdi>Test Bdi</bdi>")

        rt_element = Rt(children=["Test Rt"])
        self.assertEqual(rt_element.to_xml_string(), "<rt>Test Rt</rt>")

        rp_element = Rp(text="(")
        self.assertEqual(rp_element.to_xml_string(), "<rp>(</rp>")

        ruby_element = Ruby(children=["Test Ruby"])
        self.assertEqual(ruby_element.to_xml_string(), "<ruby>Test Ruby</ruby>")


class TestHTMLStringIntegration(unittest.TestCase):
    def test_complex_html_parsing(self):
        complex_html = """
        <div class="container" id="main">
            <p>This is a <strong>complex</strong> paragraph with <em>emphasis</em> and a
               <a href="file.html#anchor">link to example</a>.</p>
            <img src="image.jpg" alt="Test image" width="300" height="200" />
        </div>
        <ul>
            <li>First <strong>bold</strong> item</li>
            <li>Second item with <a href="page2.html">internal link</a></li>
            <li>Third item</li>
        </ul>
        <ol>
            <li>Numbered item one</li>
            <li>Numbered item <em>two</em></li>
        </ol>
        <p>Final paragraph with<br />line break.</p>
        """

        # Parse the HTML
        elements = HTMLElement.from_html_string(complex_html)

        # Should have 4 root elements: div, ul, ol, p
        self.assertEqual(
            len(elements), 4, f"Expected 4 root elements, got {len(elements)}"
        )

        # Test first element: div with complex content
        div_element = elements[0]
        self.assertIsInstance(div_element, Div)
        self.assertEqual(div_element.class_, "container")
        self.assertEqual(div_element.id_, "main")

        # Div should have 2 children: p and img
        self.assertEqual(len(div_element.children), 2)

        # Test paragraph inside div
        p_element = div_element.children[0]
        self.assertIsInstance(p_element, P)

        # Paragraph should have mixed content: text, strong, text, em, text, a, text
        p_children = p_element.children
        self.assertEqual(len(p_children), 7)

        # Find and test the strong element
        strong_element = p_children[1]
        self.assertEqual(len(strong_element.children), 1)
        self.assertIsInstance(strong_element.children[0], TextNode)
        self.assertEqual(strong_element.children[0].text, "complex")

        # Find and test the em element
        em_element = p_children[3]
        self.assertEqual(len(em_element.children), 1)
        self.assertEqual(em_element.children[0].text, "emphasis")

        # Find and test the link element
        a_element = p_children[5]
        self.assertEqual(str(a_element.href), "file.html#anchor")
        self.assertEqual(len(a_element.children), 1)
        self.assertEqual(a_element.children[0].text, "link to example")

        # Test image element
        img_element = div_element.children[1]
        self.assertIsInstance(img_element, Img)
        self.assertEqual(str(img_element.src), "image.jpg")
        self.assertEqual(img_element.alt, "Test image")
        self.assertEqual(img_element.width, 300)
        self.assertEqual(img_element.height, 200)

        # Test second element: unordered list
        ul_element = elements[1]
        self.assertIsInstance(ul_element, Ul)
        self.assertEqual(len(ul_element.children), 3)

        # Test first list item
        li1 = ul_element.children[0]
        self.assertIsInstance(li1, Li)
        li1_children = li1.children
        # Should have: TextNode("First "), Strong("bold"), TextNode(" item")
        self.assertEqual(len(li1_children), 3)

        # Find strong in first list item
        li1_strong = li1_children[1]
        self.assertEqual(li1_strong.children[0].text, "bold")

        # Test second list item with link
        li2 = ul_element.children[1]
        self.assertIsInstance(li2, Li)
        li2_link = li2.children[1]
        self.assertEqual(li2_link.href, "page2.html")

        # Test third element: ordered list
        ol_element = elements[2]
        self.assertIsInstance(ol_element, Ol)
        self.assertEqual(len(ol_element.children), 2)

        # Test ordered list items
        ol_li1 = ol_element.children[0]
        self.assertIsInstance(ol_li1, Li)

        ol_li2 = ol_element.children[1]
        self.assertIsInstance(ol_li2, Li)
        ol_li2_em = ol_li2.children[1]
        self.assertEqual(ol_li2_em.children[0].text, "two")

        # Test fourth element: paragraph with line break
        final_p = elements[3]
        self.assertIsInstance(final_p, P)
        br_element = final_p.children[1]
        self.assertIsInstance(br_element, Br)

    def test_simple_html_parsing(self):
        """Test parsing simple HTML elements"""

        simple_html = "<p>Hello <strong>world</strong>!</p>"
        elements = HTMLElement.from_html_string(simple_html)

        self.assertEqual(len(elements), 1)
        p = elements[0]
        self.assertIsInstance(p, P)
        self.assertEqual(len(p.children), 3)

        # Check strong element
        strong = p.children[1]
        self.assertIsInstance(strong, Strong)
        self.assertEqual(strong.children[0].text, "world")

    def test_empty_and_self_closing_elements(self):
        """Test parsing empty elements and self-closing tags"""

        html = """
        <p></p>
        <img src="test.jpg" alt="test" />
        <br />
        <div><span></span></div>
        """

        elements = HTMLElement.from_html_string(html)
        self.assertEqual(len(elements), 4)

        # Empty paragraph
        self.assertIsInstance(elements[0], P)
        self.assertEqual(len(elements[0].children), 0)

        # Image with attributes
        self.assertIsInstance(elements[1], Img)
        self.assertEqual(elements[1].src, "test.jpg")
        self.assertEqual(elements[1].alt, "test")

        # Line break
        self.assertIsInstance(elements[2], Br)

        # Div with empty span
        self.assertIsInstance(elements[3], Div)
        self.assertEqual(len(elements[3].children), 1)
        self.assertIsInstance(elements[3].children[0], Span)
        self.assertEqual(len(elements[3].children[0].children), 0)

    def test_roundtrip_conversion(self):
        """Test that HTML -> Pydantic -> XML maintains structure"""

        original_html = """
        <p>Test <strong>bold</strong> and <em>italic</em> text.</p>
        <ul>
            <li>Item 1</li>
            <li>Item 2</li>
        </ul>
        """

        # Parse to Pydantic objects
        elements = HTMLElement.from_html_string(original_html)

        # Convert back to XML strings
        xml_output = "".join(elem.to_xml_string() for elem in elements)

        self.assertEqual(
            "".join(m.strip() for m in original_html.split("\n")), xml_output.strip()
        )

    def test_attribute_type_conversion(self):
        """Test that attributes are properly converted to correct types"""

        html = """
        <div class="test-class" id="test-id">
            <a href="file.html?query=test">Link</a>
            <img src="image.png" alt="Alt text" width="100" height="50" />
        </div>
        """

        elements = HTMLElement.from_html_string(html)
        div = elements[0]

        # Test div attributes
        self.assertEqual(div.class_, "test-class")
        self.assertEqual(div.id_, "test-id")

        # Test link attributes
        a = div.children[0]
        self.assertEqual(a.href, "file.html?query=test")

        # Test image attributes
        img = div.children[1]
        self.assertEqual(img.src, "image.png")
        self.assertEqual(img.alt, "Alt text")
        self.assertEqual(img.width, 100)
        self.assertEqual(img.height, 50)


class TestFileDependencies(unittest.TestCase):
    def test_img_src_dependencies(self):
        img = Img(src="image.jpg", alt="Test image")
        dependencies = img.get_file_dependencies()
        self.assertEqual(dependencies, ["image.jpg"])

    def test_img_srcset_dependencies(self):
        img = Img(
            src="fallback.jpg",
            srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w",
            alt="Responsive image",
        )
        dependencies = img.get_file_dependencies()
        self.assertEqual(
            set(dependencies), {"fallback.jpg", "small.jpg", "medium.jpg", "large.jpg"}
        )

    def test_img_srcset_with_density_descriptors(self):
        img = Img(
            src="image.jpg",
            srcset="image.jpg 1x, image@2x.jpg 2x, image@3x.jpg 3x",
            alt="High DPI image",
        )
        dependencies = img.get_file_dependencies()
        self.assertEqual(
            set(dependencies), {"image.jpg", "image@2x.jpg", "image@3x.jpg"}
        )

    def test_a_href_dependencies(self):
        a = A(href="document.pdf", children=["Download PDF"])
        dependencies = a.get_file_dependencies()
        self.assertEqual(dependencies, ["document.pdf"])

    def test_audio_src_dependencies(self):
        audio = Audio(src="audio.mp3", children=["Audio not supported"])
        dependencies = audio.get_file_dependencies()
        self.assertEqual(dependencies, ["audio.mp3"])

    def test_video_src_dependencies(self):
        video = Video(src="video.mp4", children=["Video not supported"])
        dependencies = video.get_file_dependencies()
        self.assertEqual(dependencies, ["video.mp4"])

    def test_source_src_dependencies(self):
        source = Source(src="video.webm")
        dependencies = source.get_file_dependencies()
        self.assertEqual(dependencies, ["video.webm"])

    def test_source_srcset_dependencies(self):
        source = Source(srcset="banner-480.jpg 480w, banner-800.jpg 800w")
        dependencies = source.get_file_dependencies()
        self.assertEqual(set(dependencies), {"banner-480.jpg", "banner-800.jpg"})

    def test_track_src_dependencies(self):
        track = Track(src="subtitles.vtt", kind="subtitles")
        dependencies = track.get_file_dependencies()
        self.assertEqual(dependencies, ["subtitles.vtt"])

    def test_blockquote_cite_dependencies(self):
        blockquote = Blockquote(
            cite="https://example.com/source.html", children=["Quote text"]
        )
        dependencies = blockquote.get_file_dependencies()
        # HttpUrl attributes are not included in file dependencies as they're external
        self.assertEqual(dependencies, [])

    def test_nested_element_dependencies(self):
        img = Img(src="nested.jpg", alt="Nested image")
        link = A(href="page.html", children=["Link text"])
        div = Div(children=[img, link, "Some text"])

        dependencies = div.get_file_dependencies()
        self.assertEqual(set(dependencies), {"nested.jpg", "page.html"})

    def test_complex_nested_dependencies(self):
        # Create a complex structure with multiple file dependencies
        img1 = Img(src="image1.jpg", alt="Image 1")
        img2 = Img(
            src="image2.png",
            srcset="image2-small.png 480w, image2-large.png 1200w",
            alt="Image 2",
        )
        link = A(href="document.pdf", children=["Download"])
        audio = Audio(src="background.mp3", children=["Audio"])

        source1 = Source(src="video.webm")
        source2 = Source(src="video.mp4")
        video = Video(children=[source1, source2, "Video not supported"])

        root_div = Div(children=[img1, img2, link, audio, video])

        dependencies = root_div.get_file_dependencies()
        expected = [
            "image1.jpg",
            "image2.png",
            "image2-small.png",
            "image2-large.png",
            "document.pdf",
            "background.mp3",
            "video.webm",
            "video.mp4",
        ]
        self.assertEqual(set(dependencies), set(expected))

    def test_picture_element_dependencies(self):
        source1 = Source(srcset="mobile.jpg 480w, tablet.jpg 800w")
        source2 = Source(srcset="desktop.jpg 1200w")
        img = Img(src="fallback.jpg", alt="Picture")
        picture = Picture(children=[source1, source2], img=img)

        dependencies = picture.get_file_dependencies()
        expected = ["mobile.jpg", "tablet.jpg", "desktop.jpg", "fallback.jpg"]
        self.assertEqual(set(dependencies), set(expected))

    def test_table_with_dependencies(self):
        img_cell = Td(children=[Img(src="table-image.jpg", alt="Table image")])
        link_cell = Td(children=[A(href="table-link.html", children=["Link"])])
        row = Tr(children=[img_cell, link_cell])
        table = Table(children=[row])

        dependencies = table.get_file_dependencies()
        self.assertEqual(set(dependencies), {"table-image.jpg", "table-link.html"})

    def test_no_dependencies(self):
        p = P(children=["Just text content"])
        dependencies = p.get_file_dependencies()
        self.assertEqual(dependencies, [])

    def test_empty_srcset(self):
        # Test that empty srcset doesn't break anything
        img = Img(src="image.jpg", alt="Image")
        dependencies = img.get_file_dependencies()
        self.assertEqual(dependencies, ["image.jpg"])

    def test_duplicate_dependencies_removed(self):
        # Test that duplicate file paths are only included once
        img1 = Img(src="same.jpg", alt="Image 1")
        img2 = Img(src="same.jpg", alt="Image 2")
        div = Div(children=[img1, img2])

        dependencies = div.get_file_dependencies()
        self.assertEqual(dependencies, ["same.jpg"])

    def test_mixed_srcset_formats(self):
        # Test srcset with mixed width and density descriptors
        img = Img(
            src="base.jpg",
            srcset="small.jpg 300w, medium.jpg 1.5x, large.jpg 2x",
            alt="Mixed srcset",
        )
        dependencies = img.get_file_dependencies()
        self.assertEqual(
            set(dependencies), {"base.jpg", "small.jpg", "medium.jpg", "large.jpg"}
        )
