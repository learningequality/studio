import base64
import copy
import os
import re
import tempfile
from io import BytesIO
from multiprocessing.dummy import Pool

import requests
from django.conf import settings
from django.core.files.storage import default_storage
from le_utils.constants import file_formats
from PIL import Image
from PIL import ImageFile

from contentcuration.api import write_raw_content_to_storage
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name

ImageFile.LOAD_TRUNCATED_IMAGES = True
THUMBNAIL_WIDTH = 400


def create_file_from_contents(
    contents, ext=None, node=None, preset_id=None, uploaded_by=None
):
    checksum, _, path = write_raw_content_to_storage(contents, ext=ext)

    result = File(
        file_format_id=ext,
        file_size=default_storage.size(path),
        checksum=checksum,
        preset_id=preset_id,
        contentnode=node,
        uploaded_by=uploaded_by,
    )
    result.file_on_disk.name = path
    result.save()
    return result


def get_file_diff(files):
    """Given a list of filenames as strings, find the filenames that aren't in our
    storage, and return.

    """

    # We use a thread pool in here, making direct HEAD requests to the storage URL
    # to see if the objects exist.
    # The threaded method is found to be the fastest -- see
    # https://gist.github.com/aronasorman/57b8c01e5ed2b7cbf876e7734b7b9f38
    # for benchmarking details.
    ret = []

    session = requests.Session()

    def check_file_url(f):
        filepath = generate_object_storage_name(os.path.splitext(f)[0], f)
        url = "/".join(
            [settings.AWS_S3_ENDPOINT_URL, settings.AWS_S3_BUCKET_NAME, filepath]
        )
        resp = session.head(url)
        if resp.status_code != 200:
            ret.append(f)

    # use a pool of 3 threads to make our queries
    pool = Pool(3)
    pool.map(check_file_url, files)

    return ret


def duplicate_file(
    file_object, node=None, assessment_item=None, preset_id=None, save=True
):
    if not file_object:
        return None
    file_copy = copy.copy(file_object)
    file_copy.id = None
    file_copy.contentnode = node
    file_copy.assessment_item = assessment_item
    file_copy.preset_id = preset_id or file_object.preset_id
    if save:
        file_copy.save()
    return file_copy


def get_thumbnail_encoding(filename, dimension=THUMBNAIL_WIDTH):
    """
    Generates a base64 encoding for a thumbnail
    Args:
        filename (str): thumbnail to generate encoding from (must be in storage already)
        dimension (int, optional): desired width of thumbnail. Defaults to 400.
    Returns base64 encoding of resized thumbnail
    """

    if filename.startswith("data:image"):
        return filename

    checksum, ext = os.path.splitext(filename.split("?")[0])
    outbuffer = BytesIO()

    # make sure the aspect ratio between width and height is 16:9
    thumbnail_size = [dimension, round(dimension / 1.77)]
    try:
        if not filename.startswith(settings.STATIC_ROOT):
            filename = generate_object_storage_name(checksum, filename)
            inbuffer = default_storage.open(filename, "rb")

        else:
            inbuffer = open(filename, "rb")

        if not inbuffer:
            raise AssertionError

        with Image.open(inbuffer) as image:
            image_format = image.format

            # Note: Image.thumbnail ensures that the image will fit in the
            # specified thumbnail size, but it retains the original image's
            # aspect ratio. So a square image will remain square rather
            # than being distorted to a 16:9 aspect ratio. This removes
            # the need to make any changes like cropping the image.
            image.thumbnail(thumbnail_size, Image.LANCZOS)

            image.save(outbuffer, image_format)
        return "data:image/{};base64,{}".format(
            ext[1:], base64.b64encode(outbuffer.getvalue()).decode("utf-8")
        )
    finally:
        # Try to close the inbuffer if it has been created
        try:
            inbuffer.close()
        except UnboundLocalError:
            pass
        outbuffer.close()


BASE64_REGEX_STR = r"data:image\/([A-Za-z]*);base64,((?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)*)"
BASE64_REGEX = re.compile(BASE64_REGEX_STR, flags=re.IGNORECASE)


def get_base64_encoding(text):
    """get_base64_encoding: Get the first base64 match or None
    Args:
        text (str): text to check for base64 encoding
    Returns: First match in text
    """
    return BASE64_REGEX.search(text)


def write_base64_to_file(encoding, fpath_out):
    """write_base64_to_file: Convert base64 image to file
    Args:
        encoding (str): base64 encoded string
        fpath_out (str): path to file to write
    Returns: None
    """

    encoding_match = get_base64_encoding(encoding)

    if not encoding_match:
        raise AssertionError("Error writing to file: Invalid base64 encoding")

    with open(fpath_out, "wb") as target_file:
        target_file.write(base64.decodebytes(encoding_match.group(2).encode("utf-8")))


def create_thumbnail_from_base64(
    encoding, file_format_id=file_formats.PNG, preset_id=None, uploaded_by=None
):
    """
    Takes encoding and makes it into a file object
    Args:
        encoding (str): base64 to make into an image file
        file_format_id (str): what the extension should be
        preset_id (str): what the preset should be
        uploaded_by (<User>): who uploaded the image
    Returns <File> object with the file_on_disk being the image file generated from the encoding
    """
    fd, path = tempfile.mkstemp()
    try:
        write_base64_to_file(encoding, path)
        with open(path, "rb") as tf:
            return create_file_from_contents(
                tf.read(),
                ext=file_format_id,
                preset_id=preset_id,
                uploaded_by=uploaded_by,
            )
    finally:
        os.close(fd)
