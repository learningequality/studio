import hashlib
import json
import logging
import os
import re
import zipfile
from abc import ABC
from abc import abstractmethod
from io import BytesIO
from tempfile import NamedTemporaryFile
from tempfile import TemporaryDirectory

from django.core.files import File
from django.core.files.storage import default_storage as storage
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from lxml import etree
from PIL import ExifTags
from PIL import Image
from PIL import ImageSequence
from PIL import PngImagePlugin

from contentcuration import models
from contentcuration.utils.assessment.qti.validation import secure_parser


# An animated image's resized frames count toward this
MAX_RESIZED_IMAGE_PIXELS = 20_000_000
# Bounds the time spent decoding an animated image's source frames
MAX_DECODED_ANIMATION_PIXELS = 100_000_000
# GIF frame disposal methods; APNG numbers them differently
GIF_DISPOSE_NONE = 1
GIF_DISPOSE_BACKGROUND = 2
EXIF_ORIENTATION_TRANSPOSE = {
    2: Image.Transpose.FLIP_LEFT_RIGHT,
    3: Image.Transpose.ROTATE_180,
    4: Image.Transpose.FLIP_TOP_BOTTOM,
    5: Image.Transpose.TRANSPOSE,
    6: Image.Transpose.ROTATE_270,
    7: Image.Transpose.TRANSVERSE,
    8: Image.Transpose.ROTATE_90,
}
SVG_PIXEL_LENGTH_REGEX = re.compile(r"([0-9]+(?:\.[0-9]+)?)(?:px)?")

image_pattern = rf"!\[([^\]]*)]\(\${exercises.CONTENT_STORAGE_PLACEHOLDER}/([^\s)]+)(?:\s=([0-9\.]+)x([0-9\.]+))*[^)]*\)"


def _exif_orientation(img):
    try:
        return img.getexif().get(ExifTags.Base.Orientation)
    except SyntaxError:
        # A truncated EXIF segment reads as no orientation
        return None


def _transpose_upright(img, orientation):
    # Not ImageOps.exif_transpose, which raises re-serialising a mistyped EXIF tag
    method = EXIF_ORIENTATION_TRANSPOSE.get(orientation)
    return img if method is None else img.transpose(method)


def _is_animated(img):
    # A JPEG with an embedded second image opens as a two-frame MPO
    if img.format == "MPO":
        return False
    try:
        return getattr(img, "is_animated", False)
    except Exception:
        # Truncated inside a later frame header; treat as a still
        return False


def _resize_animated_image(img, size):
    # Resizing the image alone keeps only the first frame
    loop = img.info.get("loop")
    frames = []
    durations = []
    try:
        for frame in ImageSequence.Iterator(img):
            # A GIF's first frame loads as P, which resizes with
            # NEAREST rather than LANCZOS
            frames.append(frame.convert("RGBA").resize(size, Image.LANCZOS))
            # WebP sets the duration only once the frame is loaded
            durations.append(frame.info.get("duration", 0))
    except Exception as e:
        # Keep the frames that decoded
        if not frames:
            raise
        logging.warning(f"Truncated animation, keeping {len(frames)} frames: {str(e)}")
    # Each resized frame is fully composited. Leaving it in place
    # lets the encoder store only what changes in the next, but a
    # GIF draws over it, so a transparent GIF clears it instead.
    disposal = PngImagePlugin.Disposal.OP_NONE
    if img.format == "GIF":
        transparent = any(f.getchannel("A").getextrema()[0] < 255 for f in frames)
        disposal = GIF_DISPOSE_BACKGROUND if transparent else GIF_DISPOSE_NONE
        for i, frame in enumerate(frames):
            if transparent:
                # GIF transparency is binary and Pillow makes any alpha > 0 opaque,
                # so LANCZOS's partial-alpha edges would grow an opaque fringe
                frame.putalpha(
                    frame.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
                )
            else:
                # Quantising RGBA reuses the first frame's palette for every frame
                frames[i] = frame.convert("RGB")
    buffered = BytesIO()
    frames[0].save(
        buffered,
        format=img.format,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        disposal=disposal,
        # An APNG otherwise inherits the source frame's blend, and
        # blending over the kept frame never clears transparent pixels
        blend=PngImagePlugin.Blend.OP_SOURCE,
        **({} if loop is None else {"loop": loop}),
    )
    return buffered.getvalue()


def resize_image(image_content, width, height):
    """
    The resized image, ``image_content`` unchanged when a resize isn't needed
    or affordable, or None when the image can't be decoded.
    """
    try:
        with Image.open(BytesIO(image_content)) as img:
            original_format = img.format
            icc_profile = img.info.get("icc_profile")
            size = (int(width), int(height))
            if _is_animated(img):
                if size == img.size:
                    return image_content
                # Every frame is held resized, but decoded one at a time
                if img.n_frames * size[0] * size[1] > MAX_RESIZED_IMAGE_PIXELS:
                    return image_content
                if img.n_frames * img.width * img.height > MAX_DECODED_ANIMATION_PIXELS:
                    return image_content
                return _resize_animated_image(img, size)
            if size[0] * size[1] > MAX_RESIZED_IMAGE_PIXELS:
                return image_content
            # Resize before rotating upright, so no full-size rotated copy is held.
            # Orientations 5-8 swap the width and height.
            orientation = _exif_orientation(img)
            stored_size = size[::-1] if orientation in (5, 6, 7, 8) else size
            same_size = stored_size == img.size
            if not same_size:
                img = img.resize(stored_size, Image.LANCZOS)
            img = _transpose_upright(img, orientation)
            buffered = BytesIO()
            img.save(buffered, format=original_format, icc_profile=icc_profile)
            resized_content = buffered.getvalue()
            if same_size and len(resized_content) >= len(image_content):
                # Re-encoding at the same size only helps when it shrinks the file.
                # Unchanged content hashes to the original's checksum, so it ships
                # as the original.
                return image_content
            return resized_content
    except Exception as e:
        logging.warning(f"Error resizing image: {str(e)}")
        return None


def resize_svg(image_content, width, height):
    """
    A copy of an SVG drawn at ``width``x``height``, or None when it doesn't
    parse or has neither a ``viewBox`` nor a unitless size to scale from.
    """
    try:
        root = etree.fromstring(image_content, secure_parser())
    except etree.XMLSyntaxError as e:
        logging.warning(f"Error resizing SVG: {str(e)}")
        return None
    if root.get("viewBox") is None:
        natural_size = [
            SVG_PIXEL_LENGTH_REGEX.fullmatch(root.get(name) or "")
            for name in ("width", "height")
        ]
        if not all(natural_size):
            return None
        # Without a viewBox, a new size crops the drawing instead of scaling it
        root.set("viewBox", "0 0 {} {}".format(*(m[1] for m in natural_size)))
    root.set("width", f"{width:g}")
    root.set("height", f"{height:g}")
    return etree.tostring(root.getroottree(), encoding="utf-8")


def get_resized_image_checksum(image_content):
    return hashlib.md5(image_content).hexdigest()


class ExerciseArchiveGenerator(ABC):
    """
    Abstract base class for exercise zip generators.
    Handles common functionality for creating exercise zip files for different formats.
    """

    ZIP_DATE_TIME = (2015, 10, 21, 7, 28, 0)
    ZIP_COMPRESS_TYPE = zipfile.ZIP_DEFLATED
    ZIP_COMMENT = "".encode()
    # Keep the ` =WxH` suffix on sized images, for formats whose markup carries the size
    KEEP_IMAGE_SIZES = False

    @property
    @abstractmethod
    def file_format(self):
        pass

    @property
    @abstractmethod
    def preset(self):
        pass

    @abstractmethod
    def get_image_file_path(self):
        """
        Abstract method to get the archive file path for storing assessment image files.

        Returns:
            str: The file path for images in the exercise archive
        """
        pass

    @abstractmethod
    def get_image_ref_prefix(self):
        """
        A value to insert in front of the image path - this adds both the special placeholder
        that our Perseus viewer uses to find images, and the relative path to the images directory.
        """
        pass

    @abstractmethod
    def create_assessment_item(self, assessment_item, processed_data):
        """
        Abstract method to create an assessment item from processed data.
        Args:
            assessment_item: The assessment item to process
            processed_data: Data processed from the assessment item
        Returns:
            A (filepath, file_content) tuple, or None if the item should be
            excluded from the archive (e.g. it failed validation).
        """
        pass

    def __init__(
        self, ccnode, exercise_data, channel_id, default_language, user_id=None
    ):
        """
        Initialize the exercise zip generator.

        Args:
            ccnode: Content node containing exercise data
            exercise_data: Data specific to the exercise format
            user_id: Optional user ID for tracking who created the exercise
        """
        self.ccnode = ccnode
        self.exercise_data = exercise_data
        self.channel_id = channel_id
        self.default_language = default_language
        self.user_id = user_id
        self.resized_images_map = {}
        self.assessment_items = []
        self.files_to_write = []
        self.tempdir = None

    def write_to_zipfile(self, zf, filepath, content):
        """
        This method is a copy of the write_file_to_zip_with_neutral_metadata function from ricecooker.
        The comment, date_time, and compress_type are parameterized to allow for Perseus to override them.
        This can be updated in future when we have a good way to avoid rebuilding perseus files, unless needed.
        """
        filepath = filepath.replace("\\", "/")
        info = zipfile.ZipInfo(filepath, date_time=self.ZIP_DATE_TIME)
        info.comment = self.ZIP_COMMENT
        info.compress_type = self.ZIP_COMPRESS_TYPE
        info.create_system = 0
        zf.writestr(info, content)

    def add_file_to_write(self, filepath, content):
        if self.tempdir is None:
            raise RuntimeError(
                "Cannot add files to write before creating the temporary directory."
            )
        full_path = os.path.join(self.tempdir, filepath)
        if os.path.exists(full_path):
            return
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        self.files_to_write.append(full_path)

    def _write_raw_perseus_assets(self, assessment_item, images_dir):
        """Write a raw Perseus item's image and graphie assets into ``images_dir``
        and return the sorted list of package-relative paths written.

        Graphie files are stored as a single delimited blob and are split into
        their ``.svg`` and ``-data.json`` parts here.
        """
        # For raw perseus JSON questions, the files must be
        # specified in advance.

        # Files have been prefetched when the assessment item was
        # queried, so take advantage of that.
        files = sorted(assessment_item.files.all(), key=lambda x: x.checksum)
        image_files = filter(
            lambda x: x.preset_id == format_presets.EXERCISE_IMAGE, files
        )
        graphie_files = filter(
            lambda x: x.preset_id == format_presets.EXERCISE_GRAPHIE, files
        )
        written_paths = []
        for image in image_files:
            image_name = "{}/{}.{}".format(
                images_dir, image.checksum, image.file_format_id
            )
            with storage.open(
                models.generate_object_storage_name(image.checksum, str(image)),
                "rb",
            ) as content:
                self.add_file_to_write(image_name, content.read())
            written_paths.append(image_name)

        for image in graphie_files:
            svg_name = "{}/{}.svg".format(images_dir, image.original_filename)
            json_name = "{}/{}-data.json".format(images_dir, image.original_filename)
            with storage.open(
                models.generate_object_storage_name(image.checksum, str(image)),
                "rb",
            ) as content:
                content = content.read()
                # in Python 3, delimiter needs to be in bytes format
                content = content.split(exercises.GRAPHIE_DELIMITER.encode("ascii"))
                if len(content) != 2:
                    raise ValueError(
                        f"Graphie file '{image.original_filename}' "
                        f"missing delimiter {exercises.GRAPHIE_DELIMITER!r}"
                    )
                self.add_file_to_write(svg_name, content[0])
                self.add_file_to_write(json_name, content[1])
            written_paths.append(svg_name)
            written_paths.append(json_name)

        return sorted(written_paths)

    def _rewrite_content_storage_refs(self, raw_data, images_dir):
        """Rewrite a raw item's content-storage references to the packaged
        ``images_dir`` (under the ``IMG_PLACEHOLDER`` the renderer resolves)."""
        return raw_data.replace(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            f"{exercises.IMG_PLACEHOLDER}/{images_dir}",
        )

    def _add_original_image(self, checksum, filename, new_file_path):
        """Extract original image handling"""
        with storage.open(
            models.generate_object_storage_name(checksum, filename), "rb"
        ) as imgfile:
            original_content = imgfile.read()
        self.add_file_to_write(os.path.join(new_file_path, filename), original_content)

    def _get_similar_image(self, filename, width, height):
        if filename not in self.resized_images_map:
            self.resized_images_map[filename] = {}
            return None
        if (width, height) in self.resized_images_map[filename]:
            return self.resized_images_map[filename][(width, height)]

        for key, resized_image in self.resized_images_map[filename].items():
            if (
                abs(key[0] - width) / width < 0.01
                and abs(key[1] - height) / height < 0.01
            ):
                return resized_image

    def _resize_image(self, checksum, ext, filename, width, height, new_file_path):
        with storage.open(
            models.generate_object_storage_name(checksum, filename),
            "rb",
        ) as imgfile:
            original_content = imgfile.read()

        resize = resize_svg if ext.lower() == f".{file_formats.SVG}" else resize_image
        resized_content = resize(original_content, width, height)

        if resized_content:
            new_img_ref = f"{get_resized_image_checksum(resized_content)}{ext}"
        else:
            logging.warning(f"Failed to resize image {filename}. Using original image.")
            # Remember the original so later references skip the retry
            new_img_ref, resized_content = filename, original_content

        self.resized_images_map[filename][(width, height)] = new_img_ref
        self.add_file_to_write(
            os.path.join(new_file_path, new_img_ref), resized_content
        )
        return new_img_ref

    def _process_single_image(
        self, filename, checksum, ext, width, height, new_file_path
    ):
        if width is None and height is None:
            # No resizing needed, just add original
            self._add_original_image(checksum, filename, new_file_path)
            return filename

        # Try to get similar or create resized image
        similar_image = self._get_similar_image(filename, width, height)
        if similar_image:
            return similar_image

        return self._resize_image(checksum, ext, filename, width, height, new_file_path)

    def _is_valid_image_filename(self, filename):
        checksum, ext = os.path.splitext(filename)

        if not ext:
            logging.warning(
                "While publishing channel `{}` a filename with no extension was encountered: `{}`".format(
                    self.channel_id, filename
                )
            )
            return False

        try:
            int(checksum, 16)  # Validate hex checksum
            return True
        except ValueError:
            logging.warning(
                "while publishing channel `{}` a filename with an improper checksum was encountered: `{}`".format(
                    self.channel_id, filename
                )
            )
            if os.environ.get("BRANCH_ENVIRONMENT", "") != "master":
                raise
            return False

    def process_image_strings(self, content):
        new_file_path = self.get_image_file_path()
        new_image_path = self.get_image_ref_prefix()
        image_list = []

        def _replace_image(img_match):
            # Add any image files that haven't been written to the zipfile
            filename = img_match.group(2)
            width = float(img_match.group(3)) if img_match.group(3) else None
            height = float(img_match.group(4)) if img_match.group(4) else None
            checksum, ext = os.path.splitext(filename)

            if not self._is_valid_image_filename(filename):
                return ""

            if width == 0 or height == 0:
                # Can't resize an image to 0 width or height, so just ignore.
                return ""

            processed_filename = self._process_single_image(
                filename, checksum, ext, width, height, new_file_path
            )

            size_suffix = ""
            if width is not None and height is not None:
                image_list.append(
                    {
                        "name": f"{new_image_path}/{processed_filename}",
                        "width": width,
                        "height": height,
                    }
                )
                if self.KEEP_IMAGE_SIZES and width >= 1 and height >= 1:
                    size_suffix = f" ={int(width)}x{int(height)}"
            return f"![{img_match.group(1)}]({new_image_path}/{processed_filename}{size_suffix})"

        content = re.sub(image_pattern, _replace_image, content)

        return content, image_list

    def _process_content(self, content):
        """
        Process the content to handle images.

        Args:
            content: The content string to process

        Returns:
            tuple: Processed content and list of image data
        """
        return self.process_image_strings(content)

    def _sort_by_order(self, items, item_type):
        try:
            return sorted(items, key=lambda x: x.get("order"))
        except TypeError:
            logging.warning(f"Unable to sort {item_type}, leaving unsorted.")
            return items

    def _process_answers(self, assessment_item):
        answer_data = json.loads(assessment_item.answers)
        processed_answers = []

        for answer in answer_data:
            if answer["answer"]:
                if isinstance(answer["answer"], str):
                    (answer["answer"], answer_images,) = self._process_content(
                        answer["answer"],
                    )
                    answer["images"] = answer_images

                processed_answers.append(answer)

        return self._sort_by_order(processed_answers, "answers")

    def _process_hints(self, assessment_item):
        hint_data = json.loads(assessment_item.hints)

        for hint in hint_data:
            hint["hint"], hint_images = self._process_content(
                hint["hint"],
            )
            hint["images"] = hint_images

        return self._sort_by_order(hint_data, "hints")

    def process_assessment_item(self, assessment_item):
        # Process question
        question, question_images = self._process_content(
            assessment_item.question,
        )

        # Process answers and hints
        processed_answers = self._process_answers(assessment_item)
        processed_hints = self._process_hints(assessment_item)

        context = {
            "question": question,
            "question_images": question_images,
            "answers": processed_answers,
            "multiple_select": assessment_item.type == exercises.MULTIPLE_SELECTION,
            "raw_data": self._rewrite_content_storage_refs(
                assessment_item.raw_data, self.get_image_file_path()
            ),
            "hints": processed_hints,
            "randomize": assessment_item.randomize,
        }
        result = self.create_assessment_item(assessment_item, context)
        if result is None:
            return
        filepath, file_content = result
        self.add_file_to_write(filepath, file_content)

    def handle_before_assessment_items(self):
        pass

    def handle_after_assessment_items(self):
        pass

    def _create_zipfile(self):
        filename = "{0}.{ext}".format(self.ccnode.title, ext=self.file_format)
        with NamedTemporaryFile(suffix="zip") as tempf:
            with zipfile.ZipFile(tempf.name, "w") as zf:
                for file_path in self.files_to_write:
                    with open(file_path, "rb") as f:
                        self.write_to_zipfile(
                            zf,
                            os.path.relpath(file_path, self.tempdir),
                            f.read(),
                        )
            file_size = tempf.tell()
            tempf.flush()

            self.ccnode.files.filter(preset_id=self.preset).delete()

            assessment_file_obj = models.File.objects.create(
                file_on_disk=File(open(tempf.name, "rb"), name=filename),
                contentnode=self.ccnode,
                file_format_id=self.file_format,
                preset_id=self.preset,
                original_filename=filename,
                file_size=file_size,
                uploaded_by_id=self.user_id,
            )
            logging.debug(
                "Created exercise for {0} with checksum {1}".format(
                    self.ccnode.title, assessment_file_obj.checksum
                )
            )

    def create_exercise_archive(self):
        with TemporaryDirectory() as tempdir:
            self.tempdir = tempdir
            self.handle_before_assessment_items()
            for question in (
                self.ccnode.assessment_items.prefetch_related("files")
                .all()
                .order_by("order")
            ):
                self.process_assessment_item(question)
            self.handle_after_assessment_items()
            self._create_zipfile()
