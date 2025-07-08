# -*- coding: utf-8 -*-
import hashlib
import json
import logging
import os
import random
import string
import uuid
from io import BytesIO
from tempfile import TemporaryFile

import pytest
from django.core.files.storage import default_storage
from le_utils.constants import exercises
from le_utils.constants import format_presets
from PIL import Image

from contentcuration import models as cc
from contentcuration.constants import (
    community_library_submission as community_library_submission_constants,
)
from contentcuration.tests.utils import mixer


pytestmark = pytest.mark.django_db


thumbnail_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"  # noqa E501


def video():
    """
    Create a video content kind entry.
    """
    return mixer.blend(cc.ContentKind, kind="video")


def preset_video():
    """
    Create a video format preset.
    """
    return mixer.blend(cc.FormatPreset, id="high_res_video", kind=video())


def topic():
    """
    Create a topic content kind.
    """
    return mixer.blend(cc.ContentKind, kind="topic")


def exercise():
    """
    Create a exercise content kind.
    """
    return mixer.blend(cc.ContentKind, kind="exercise")


def slideshow():
    """
    Returns a slideshow content kind object.
    """
    return mixer.blend(cc.ContentKind, kind="slideshow")


def fileformat_perseus():
    """
    Create a perseus FileFormat entry.
    """
    return mixer.blend(
        cc.FileFormat, extension="perseus", mimetype="application/exercise"
    )


def fileformat_mp4():
    """
    Create an mp4 FileFormat entry.
    """
    return mixer.blend(cc.FileFormat, extension="mp4", mimetype="application/video")


def license_wtfpl():
    """
    Create a license object called WTF License.
    """
    return cc.License.objects.first() or mixer.blend(
        cc.License, license_name="WTF License"
    )


def fileobj_video(contents=None):
    """
    Create an "mp4" video file on storage and return a File model pointing to it.

    if contents is given and is a string, then write said contents to the file.
    If no contents is given, a random string is generated and set as the contents of the file.
    """
    if contents:
        logging.warning("input = {}".format(contents))
        filecontents = contents
    else:
        filecontents = "".join(random.sample(string.printable, 20)).encode("utf-8")
    logging.warning("contents = {}".format(filecontents))
    temp_file_dict = create_studio_file(
        filecontents, preset=format_presets.VIDEO_HIGH_RES, ext="mp4"
    )
    return temp_file_dict["db_file"]


def node_json(data):
    node_data = {
        "title": "Recipes",
        "node_id": data.get("node_id", "acedacedacedacedacedacedacedaced"),
        "content_id": "aa480b60a7f4526f886e7df9f4e9b8cc",
        "description": "Recipes for various dishes.",
        "author": "Bradley Smoker",
        "kind": data["kind"],
        "license": data["license"],
        "extra_fields": {},
        "files": [],
        "questions": [],
    }

    return node_data


def node(data, parent=None):  # noqa: C901
    new_node = None
    # Create topics
    if "node_id" not in data:
        data["node_id"] = uuid.uuid4()
    if data["kind_id"] == "topic":
        new_node = cc.ContentNode(
            kind=topic(),
            parent=parent,
            title=data["title"],
            node_id=data["node_id"],
            content_id=data.get("content_id") or data["node_id"],
            sort_order=data.get("sort_order", 1),
            complete=True,
        )
        new_node.save()

        if "children" in data:
            for child in data["children"]:
                node(child, parent=new_node)

    # Create videos
    elif data["kind_id"] == "video":
        new_node = cc.ContentNode(
            kind=video(),
            parent=parent,
            title=data["title"],
            node_id=data["node_id"],
            license=license_wtfpl(),
            content_id=data.get("content_id") or data["node_id"],
            sort_order=data.get("sort_order", 1),
            complete=True,
            extra_fields=data.get("extra_fields"),
        )
        new_node.save()
        video_file = fileobj_video(contents=b"Video File")
        video_file.contentnode = new_node
        video_file.preset_id = format_presets.VIDEO_HIGH_RES
        video_file.duration = 100
        video_file.save()

    # Create exercises
    elif data["kind_id"] == "exercise":
        if "extra_fields" in data:
            extra_fields = data["extra_fields"]
        else:
            extra_fields = {
                "mastery_model": data.get("mastery_model", "m_of_n"),
                "randomize": True,
                "m": data.get("m") or 0,
                "n": data.get("n") or 0,
            }
        new_node = cc.ContentNode(
            kind=exercise(),
            parent=parent,
            title=data["title"],
            node_id=data["node_id"],
            license=license_wtfpl(),
            extra_fields=extra_fields,
            content_id=data.get("content_id") or data["node_id"],
            sort_order=data.get("sort_order", 1),
            complete=True,
        )

        new_node.save()
        for assessment_item in data.get("assessment_items", []):
            ai = cc.AssessmentItem(
                contentnode=new_node,
                assessment_id=assessment_item["assessment_id"],
                question=assessment_item["question"],
                type=assessment_item["type"],
                answers=json.dumps(assessment_item["answers"]),
                hints=json.dumps(assessment_item.get("hints") or []),
            )
            ai.save()

    if data.get("tags"):
        for tag in data["tags"]:
            t = cc.ContentTag(tag_name=tag["tag_name"])
            t.save()
            new_node.tags.add(t)
            new_node.save()

    return new_node


def country(name="Test Country", code="TC"):
    return mixer.blend(cc.Country, name=name, code=code)


def community_library_submission():
    channel_obj = channel(name=random_string())
    user_obj = user(email=random_string())
    channel_obj.editors.add(user_obj)
    channel_obj.version = 1
    channel_obj.save()

    return mixer.blend(
        cc.CommunityLibrarySubmission,
        channel=channel_obj,
        author=user_obj,
        status=community_library_submission_constants.STATUS_PENDING,
        categories=list(),
        channel_version=1,
    )


def tree(parent=None):
    # Read from json fixture
    filepath = os.path.sep.join([os.path.dirname(__file__), "fixtures", "tree.json"])
    with open(filepath, "rb") as jsonfile:
        data = json.load(jsonfile)

    return node(data, parent)


def channel(name="testchannel"):
    channel_creator = user()
    channel = cc.Channel.objects.create(name=name, actor_id=channel_creator.id)
    channel.save()

    channel.main_tree = tree()
    channel.save()

    return channel


def random_string(chars=10):
    """
    Generate a random string
    :param chars: Number of characters in string
    :return: A string with [chars] random characters.
    """
    return "".join(
        random.choice(string.ascii_uppercase + string.digits) for _ in range(chars)
    )


def user(email="user@test.com", feature_flags=None):
    user, is_new = cc.User.objects.get_or_create(email=email)
    if is_new:
        user.set_password("password")
        user.is_active = True
        user.save()
    if feature_flags is not None:
        user.feature_flags = feature_flags
        user.save()
    return user


def create_temp_file(filebytes, preset="document", ext="pdf", original_filename=None):
    """Old name for create_studio_file."""
    import warnings

    warnings.warn(
        "Deprecated function; use create_studio_file instead.", DeprecationWarning
    )
    return create_studio_file(
        filebytes, preset="document", ext="pdf", original_filename=None
    )


def create_studio_file(filebytes, preset="document", ext="pdf", original_filename=None):
    """
    Create a file with contents of `filebytes` and the associated cc.File object for it.
    :param filebytes: The data to be stored in the file (as bytes)
    :param preset: String identifying the format preset (defaults to ``document``)
    :param ext: File extension, omitting the initial period
    :param original_filename: Original filename (needed for exercise_images)
    Returns a dict containing the following:
    - name (str): the filename within the content storage system (= md5 hash of the contents + .ext )
    - data (bytes): file content (echo of `filebytes`)
    - file (file): a basic BytesIO file-like object that you can read/write
    - db_file (cc.File): a Studio File object saved in DB
    """
    try:
        filebytes = filebytes.encode("utf-8")
    except:  # noqa
        pass

    fileobj = BytesIO(filebytes)
    # Every time the BytesIO object is read from or appended to, we need to reset the seek position,
    # otherwise, it will start reading from the end of the file.
    fileobj.seek(0)
    hash = hashlib.md5(filebytes)
    checksum = hash.hexdigest()
    filename = "{}.{}".format(checksum, ext)
    storage_file_path = cc.generate_object_storage_name(checksum, filename)

    # 1. Write out the file bytes on to object storage
    fileobj.seek(0)
    default_storage.save(storage_file_path, fileobj)
    fileobj.seek(0)
    assert default_storage.exists(storage_file_path)

    # 2. Get the minimum required Studio meta fields for a File object
    preset = cc.FormatPreset.objects.get(id=preset)
    file_format = cc.FileFormat.objects.get(extension=ext)
    if original_filename is None:
        original_filename = "somefile." + ext

    # 3. Create a File object
    db_file_obj = mixer.blend(
        cc.File,
        checksum=checksum,
        file_format=file_format,
        preset=preset,
        original_filename=original_filename,
        file_on_disk=storage_file_path,
    )

    return {
        "name": os.path.basename(storage_file_path),
        "data": filebytes,
        "file": fileobj,
        "db_file": db_file_obj,
    }


def create_test_file(filebytes, ext="pdf"):
    """
    Create a temporary file with contents of `filebytes` for use in tests.
    :param filebytes: The data to be stored in the file (as bytes)
    :param ext: File extension, omitting the initial period
    Returns a dict containing the following:
    - checksum (str): md5 hash of file contents
    - name (str): the filename within the content storage system (= checksum + . + ext )
    - storagepath (str): the relative storage path for this file storage/c/h/checksum.ext
    - data (bytes): file content (echo of `filebytes`)
    - file (file): an instance of TemporaryFile object that you can read/write
    """
    hash = hashlib.md5(filebytes)
    checksum = hash.hexdigest()
    filename = "{}.{}".format(checksum, ext)
    storage_file_path = cc.generate_object_storage_name(checksum, filename)
    fileobj = TemporaryFile()
    fileobj.write(filebytes)
    fileobj.seek(0)
    return {
        "checksum": checksum,
        "name": os.path.basename(storage_file_path),
        "storagepath": storage_file_path,
        "data": filebytes,
        "file": fileobj,
    }


invalid_file_json = [
    {
        "slug": "counting-out-1-20-objects",
        "kind": "exercise",
        "title": "Count with small numbers",
        "source_id": "counting-out-1-20-objects",
        "node_id": "1243434343434343434343",
        "content_id": "abcabcddafadfadsfsafs",
        "thumbnail": "https://cdn.kastatic.org/ka-exercise-screenshots/counting-out-1-20-objects.png",
        "description": "Practice counting up to 10 objects.",
        "author": "Khan Academy",
        "extra_fields": {},
        "exercise_data": {"m": 5, "n": 7, "mastery_model": "m_of_n"},
        "license": "CC-BY",
        "files": [],
        "questions": [
            {
                "type": "single_selection",
                "question": "What is your quest?",
                "hints": ["Holy", "Coconuts"],
                "answers": [
                    "To seek the grail",
                    "To eat some hail",
                    "To spectacularly fail",
                    "To post bail",
                ],
                "files": [
                    {
                        "filename": "nonexistant.mp4",
                        "size": 0,
                    }
                ],
                "source_url": "",
                "raw_data": "",
                "assessment_id": "1",
            }
        ],
    }
]


def fileobj_exercise_image(size=(100, 100), color="red"):
    """
    Create a generic exercise image file in storage and return a File model pointing to it.
    """
    image = Image.new("RGB", size, color=color)
    buffer = BytesIO()
    image.save(buffer, "JPEG")
    temp_file_dict = create_studio_file(
        buffer.getvalue(), preset=format_presets.EXERCISE_IMAGE, ext="jpg"
    )
    return temp_file_dict["db_file"]


def fileobj_exercise_graphie(original_filename=None):
    """
    Create an graphi exercise image file in storage and return a File model pointing to it.
    """
    svg_content = f"<svg><circle cx='50' cy='50' r='40' />{original_filename or ''.join(random.sample(string.printable, 20))}</svg>"
    json_content = '{"version": {"major": 0, "minor": 0}}'
    filecontents = svg_content + exercises.GRAPHIE_DELIMITER + json_content
    temp_file_dict = create_studio_file(
        filecontents,
        preset=format_presets.EXERCISE_GRAPHIE,
        ext="graphie",
        original_filename=original_filename or "theoriginalfilename",
    )
    return temp_file_dict["db_file"]


def base64encoding():
    return (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/"
        "9hAAACk0lEQVR4AaWTA7TbbABA8/+zreMdzbYOZtu2bbt4rpPUtvlebbezbdvMvsxmG99740"
        "CDF6z4p/G3RYkFLQPGmvj8mx30m7uo1LhNO6ou50r++zrkMoj/cRWUJmIz0gvEDXIVvP/Hbd"
        "xRte+chaXe7gDDsP9WwqLJixicgqWwsNrncZFJ2UnmM+Xy1awlqDz/LVsKC6oDtxA0k/B1aD"
        "Oi6rMBVVi2ys1Td+qd5NU8ZV0cWEKeWsZ4IKbdn3ikOJTogm9bw1PWw50twAWNFbS9oK1UlX"
        "Y337KA6sxwiBb/NIJYM3KrRNOSppD1YNtM9wwHUs+S188M38hXtCKKNSOAM4PmzKCgWQhaNU"
        "SiGCIE1DKGYozyJc5EW47ZZ2Ka3U0oNieTbLNjruOHsCO3LvNgq6cZznAHuAICah5DohjDUEG"
        "+OciQRsbQlFGKUOvrw9d6uSiiKcu3h9S86F7Me/oMtv/yFVsofaQCYHyhxtcLuFSGNDwatCGI"
        "SrZE6EzXIJYkoqILPR0k2oCMo/b1EOpcQqEnjkXPnseOX71uEuqDvQCTAqfjW5fhGkQlWyMQf"
        "acZYRHs61jc4HKOJAGXBE+1F1vjdRiwegEstrywB9OYK5zdITZH6xUHTnUADgLcpaBZD1omxCY"
        "5m6K7HRaEUDxDZjoyWOs9Xwu/43lbWTUKSfwwzNGfROX2hvg2wGrLjEcGIwTHTHR3sQW0jSEcIN"
        "tsnembjYu2z0fKfngHaEXm2jzYmXaUHL7k3H+z6YftOxagZXEXNJ2+eJV3zGF/8RZyWZ6RakH8ad"
        "Z9AksmLmz6nO2cy/3vl9+CnJdYZJRmn+x1HsOOh07BkcTF0p/z39hBuoJNuW9U2nF01rngydo/+xr"
        "/aXwDY2vpQfdHLrIAAAAASUVORK5CYII="
    )


def generated_base64encoding():
    return (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAA"
        "C8klEQVR4nKWTSWhVZxiGv/N//3+Ge+49d8gdkphYOyxMGm+p1QQSm40KIgqKoKUuKu0idFMIWRWKC7"
        "G4sqEDxZUEQciwMsaEihsV0ThAojYmahK8NjXJzXCH3DP955zfRUkWIljwW368z7t6H+nA953wPkf/b"
        "/DY/q0MACIAUO4bnuTrfwIAwH0X9UTM+OSL7dKb4KFPU9Kh9g8ahBDtAKC8WqO+Ho8ZrucgAIAkhJC6"
        "zl047vju54js1MzD8eI6vHtfS0va0I44+bmX3DMvXL45V/wom435vndSQfnB04djF6WfzvXt9aXgBxb"
        "RB6iqNpZWV36ZvD+62PH1gSqf0SEvpGY5wp6Lf/TebtjRkonEE53ctie8cuUoCtJNiAMdOgsPVyU3fUm"
        "Z/CTOcNf21tbs7D/zjYvLhUaUCP04lc5kdzZ/FmfYSpk8lUpuatNZeJg40EE0IddIHJaE6WC9oj1Kx5Lf"
        "ZKJxHhipr1aAGWElJEdQOVifTnupWPJEvaKNB6YjS1zkNaHUEtlDP6ongNhQ8ktmFboiT/9dnTYkLZWK"
        "1wLSEHBHqm6qrp1BVyz7RTNObChF9YSQPSII9SQURdOkXNSU14ICA9RIItlCLNtEywaVIKgEvelcvpUB"
        "yuVKUKZcVIuCZVGPEEpc8QgLvAkU/7aqhL9Np5PdC6X8i9LL3ChW7OMFRmmFkDFC6eNUNPOrbS19xx3n"
        "Fhb5NvCDMaIw9TcU0i6yYBZDhnGl7LHZ/it9eevVUq81lx99MZWbnsnN9/SPDCys+Ww2FDGGyEJlDQVpU5"
        "j6OxnMjUwIHvzMLTv0bOT61Z6B7mUAACVeh9FYnbpl81btw6ZmDQCgZ6B76flfN65yy9EE908P5kYmKQDA0"
        "OK1Ozu9htH7dEqsjyik6O0RVW/KIFM8yzoMABMAAPdg0m1exD/v4t9iY8oAAPfokw34v4JwjcxkQYIAYq5b9"
        "+OJrg1v1uF3yITnGcV5zxcxRYhLZ3rOem9LSe+r82vB1kP1vFwEDQAAAABJRU5ErkJggg=="
    )


def srt_subtitle():
    return """1
00:00:12,464 --> 00:00:14,979
أمضيت ما يقرب من العقدين

2
00:00:14,979 --> 00:00:18,532
ألاحظ ما يجعل البعض أكثر حظًا من غيرهم

3
00:00:18,536 --> 00:00:22,119
وأحاول مساعدة الناس على زيادة حظهم.

    """
