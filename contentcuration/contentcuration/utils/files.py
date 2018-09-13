import copy
import os
import random
import requests
import shutil
import tempfile
import zipfile
from multiprocessing.dummy import Pool

from contentcuration.api import (write_file_to_storage,
                                 write_raw_content_to_storage)
from contentcuration.models import (File, generate_file_on_disk_name,
                                    generate_object_storage_name)
from django.conf import settings
from django.core.files import File as DjFile
from django.core.files.storage import default_storage
from le_utils.constants import content_kinds, file_formats, format_presets
from pressurecooker.images import (create_image_from_pdf_page,
                                   create_tiled_image, create_waveform_image)
from pressurecooker.videos import compress_video, extract_thumbnail_from_video


def create_file_from_contents(contents, ext=None, node=None, preset_id=None, uploaded_by=None):
    checksum, _, path = write_raw_content_to_storage(contents, ext=ext)
    with default_storage.open(path, 'rb') as new_file:
        return File.objects.create(
            file_on_disk=DjFile(new_file),
            file_format_id=ext,
            file_size=default_storage.size(path),
            checksum=checksum,
            preset_id=preset_id,
            contentnode=node,
            uploaded_by=uploaded_by
        )


def get_file_diff(files):
    """Given a list of filenames as strings, find the filenames that aren't in our
    storage, and return.

    """
    storage = default_storage

    # We use a thread pool in here, making direct HEAD requests to the storage URL
    # to see if the objects exist.
    # The threaded method is found to be the fastest -- see
    # https://gist.github.com/aronasorman/57b8c01e5ed2b7cbf876e7734b7b9f38
    # for benchmarking details.
    ret = []

    session = requests.Session()
    def check_file_url(f):
        filepath = generate_object_storage_name(os.path.splitext(f)[0], f)
        url = "/".join([settings.AWS_S3_ENDPOINT_URL, settings.AWS_S3_BUCKET_NAME, filepath])
        resp = session.head(url)
        if resp.status_code != 200:
            ret.append(f)

    # use a pool of 3 threads to make our queries
    pool = Pool(3)
    pool.map(check_file_url, files)

    return ret


def duplicate_file(file_object, node=None, assessment_item=None, preset_id=None, save=True):
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


def extract_thumbnail_wrapper(file_object, node=None, preset_id=None):
    ext = file_formats.PNG
    with tempfile.NamedTemporaryFile(suffix=".{}".format(ext)) as tempf, tempfile.NamedTemporaryFile(suffix=".{}".format(file_object.file_format.extension)) as localtempf:
        shutil.copyfileobj(file_object.file_on_disk, localtempf)
        localtempf.flush()
        tempf.close()
        extract_thumbnail_from_video(localtempf.name, tempf.name, overwrite=True)
        with open(tempf.name, 'rb') as tf:
            return create_file_from_contents(tf.read(), ext=ext, node=node, preset_id=preset_id, uploaded_by=file_object.uploaded_by)


def compress_video_wrapper(file_object, ffmpeg_settings=None):
    ffmpeg_settings = ffmpeg_settings or {}

    with tempfile.NamedTemporaryFile(suffix=".{}".format(file_formats.MP4)) as tempf:
        tempf.close()
        compress_video(str(file_object.file_on_disk), tempf.name, overwrite=True, **ffmpeg_settings)
        filename = write_file_to_storage(open(tempf.name, 'rb'), name=tempf.name)
        checksum, ext = os.path.splitext(filename)
        file_location = generate_file_on_disk_name(checksum, filename)
        low_res_object = File(
            file_on_disk=DjFile(open(file_location, 'rb')),
            file_format_id=file_formats.MP4,
            original_filename=file_object.original_filename,
            contentnode=file_object.contentnode,
            file_size=os.path.getsize(file_location),
            preset_id=format_presets.VIDEO_LOW_RES,
        )
        low_res_object.save()
        return low_res_object


def create_tiled_image_wrapper(files, preset_id, node=None):
    ext = file_formats.PNG
    random.shuffle(files)
    if len(files) >= 4:
        files = files[:4]
    elif len(files) >= 1:
        files = files[:1]

    with tempfile.NamedTemporaryFile(suffix=".{}".format(ext)) as tempf:
        tempf.close()
        create_tiled_image(files, tempf.name)
        user = (len(files) > 0 and not isinstance(files[0], basestring) and files[0].uploaded_by) or None
        with open(tempf.name, 'rb') as tf:
            return create_file_from_contents(tf.read(), ext=ext, node=node, preset_id=preset_id, uploaded_by=user)


def get_image_from_exercise(file_ids, node=None, preset_id=None):
    image = File.objects.filter(id__in=file_ids, preset_id=format_presets.EXERCISE_IMAGE).first()
    return duplicate_file(image, node=node, preset_id=preset_id)


def get_image_from_htmlnode(htmlfile, node=None, preset_id=None):
    with zipfile.ZipFile(htmlfile.file_on_disk, 'r') as zf:
        image_exts = [file_formats.PNG, file_formats.JPEG, file_formats.JPG]
        names = filter(lambda f: os.path.splitext(f)[1][1:] in image_exts, zf.namelist())
        if len(names):
            image_name = random.choice(names)
            _, ext = os.path.splitext(image_name)
            with zf.open(image_name) as image:
                return create_file_from_contents(image.read(), ext=ext[1:], node=node, preset_id=preset_id, uploaded_by=htmlfile.uploaded_by)


def get_image_from_pdf(document, node=None, preset_id=None):
    ext = file_formats.PNG
    orig_ext = document.file_format.extension

    with tempfile.NamedTemporaryFile(suffix=".{}".format(ext)) as tempf, tempfile.NamedTemporaryFile(suffix=".{}".format(orig_ext)) as localtempf:
        # localtempf is where we store the file in case it's in object storage
        shutil.copyfileobj(document.file_on_disk, localtempf)
        tempf.close()
        localtempf.flush()

        create_image_from_pdf_page(localtempf.name, tempf.name)

        with open(tempf.name, 'rb') as tf:
            return create_file_from_contents(tf.read(), ext=ext, node=node, preset_id=preset_id, uploaded_by=document.uploaded_by)


def get_image_from_audio(audio, node=None, preset_id=None, max_num_of_points=None):
    ext = file_formats.PNG
    cmap_options = {'name': 'BuPu', 'vmin': 0.3, 'vmax': 0.7, 'color': 'black'}
    with tempfile.NamedTemporaryFile(suffix=".{}".format(ext)) as tempf, tempfile.NamedTemporaryFile(suffix=".{}".format(audio.file_format.extension)) as localtempf:
        # localtempf is where we store the file in case it's in object storage
        shutil.copyfileobj(audio.file_on_disk, localtempf)
        tempf.close()
        localtempf.flush()
        create_waveform_image(localtempf.name, tempf.name, max_num_of_points=max_num_of_points, colormap_options=cmap_options)
        with open(tempf.name, 'rb') as tf:
            return create_file_from_contents(tf.read(), ext=ext, node=node, preset_id=preset_id, uploaded_by=audio.uploaded_by)


def generate_thumbnail_from_node(node, set_node=None):
    thumbnail_object = None
    assigned_node = node if set_node else None
    if node.kind_id == content_kinds.TOPIC:
        files = []
        for n in node.get_descendants().all():
            file_locations = n.files.filter(file_format_id__in=[file_formats.PNG, file_formats.JPG, file_formats.JPEG]).values_list('file_on_disk', flat=True)
            files += [str(f) for f in file_locations]
        assert any(files), "No images available to generate thumbnail"
        thumbnail_object = create_tiled_image_wrapper(list(set(files)), format_presets.TOPIC_THUMBNAIL, node=assigned_node)
    elif node.kind_id == content_kinds.VIDEO:
        file_object = node.files.filter(file_format_id=file_formats.MP4).first()
        thumbnail_object = extract_thumbnail_wrapper(file_object, preset_id=format_presets.VIDEO_THUMBNAIL, node=assigned_node)
    elif node.kind_id == content_kinds.EXERCISE:
        file_ids = node.assessment_items.values_list('files__id', flat=True)
        thumbnail_object = get_image_from_exercise(file_ids, preset_id=format_presets.EXERCISE_THUMBNAIL, node=assigned_node)
    elif node.kind_id == content_kinds.HTML5:
        htmlfile = node.files.filter(preset_id=format_presets.HTML5_ZIP).first()
        if htmlfile:
            thumbnail_object = get_image_from_htmlnode(htmlfile, preset_id=format_presets.HTML5_THUMBNAIL, node=assigned_node)
    elif node.kind_id == content_kinds.DOCUMENT:
        document = node.files.filter(preset_id=format_presets.DOCUMENT).first()
        if document:
            thumbnail_object = get_image_from_pdf(document, preset_id=format_presets.DOCUMENT_THUMBNAIL, node=assigned_node)
    elif node.kind_id == content_kinds.AUDIO:
        audio = node.files.filter(preset_id=format_presets.AUDIO).first()
        if audio:
            thumbnail_object = get_image_from_audio(audio, preset_id=format_presets.AUDIO_THUMBNAIL, node=assigned_node, max_num_of_points=1500000)
    else:
        raise NotImplementedError("Thumbnail generation for this kind is not supported")

    assert thumbnail_object, "Cannot generate thumbnail for this content"

    return thumbnail_object
