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
from PIL import Image

from contentcuration import models


image_pattern = rf"!\[([^\]]*)]\(\${exercises.CONTENT_STORAGE_PLACEHOLDER}/([^\s)]+)(?:\s=([0-9\.]+)x([0-9\.]+))*[^)]*\)"


def resize_image(image_content, width, height):
    try:
        with Image.open(BytesIO(image_content)) as img:
            original_format = img.format
            img = img.resize((int(width), int(height)), Image.LANCZOS)
            buffered = BytesIO()
            img.save(buffered, format=original_format)
            return buffered.getvalue()
    except Exception as e:
        logging.warning(f"Error resizing image: {str(e)}")
        return None


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
            filepath: Path for the created assessment item file
            file_content: Content of the assessment item file
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

        resized_content = resize_image(original_content, width, height)

        if not resized_content:
            logging.warning(f"Failed to resize image {filename}. Using original image.")
            return
        resized_checksum = get_resized_image_checksum(resized_content)

        new_img_ref = f"{resized_checksum}{ext}"
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

        resized_image = self._resize_image(
            checksum, ext, filename, width, height, new_file_path
        )
        return resized_image or filename

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

            if width is not None and height is not None:
                image_list.append(
                    {
                        "name": f"{new_image_path}/{processed_filename}",
                        "width": width,
                        "height": height,
                    }
                )
            return f"![{img_match.group(1)}]({new_image_path}/{processed_filename})"

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

        new_file_path = self.get_image_file_path()
        new_image_path = f"{exercises.IMG_PLACEHOLDER}/{new_file_path}"
        context = {
            "question": question,
            "question_images": question_images,
            "answers": processed_answers,
            "multiple_select": assessment_item.type == exercises.MULTIPLE_SELECTION,
            "raw_data": assessment_item.raw_data.replace(
                exercises.CONTENT_STORAGE_PLACEHOLDER, new_image_path
            ),
            "hints": processed_hints,
            "randomize": assessment_item.randomize,
        }
        filepath, file_content = self.create_assessment_item(assessment_item, context)
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
