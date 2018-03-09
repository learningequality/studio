import pytest
from StringIO import StringIO

from django.conf import settings
from django.core.files import File as DjangoFile
from django.core.management import call_command

from minio import Minio
from minio.error import ResponseError, BucketAlreadyOwnedByYou

from contentcuration.models import File, FileFormat, generate_object_storage_name
from contentcuration.utils.minio import start_minio

BUCKET = "bakit"

@pytest.yield_fixture
def minio_server():
    m = start_minio()
    yield m
    m.terminate()

@pytest.fixture
def minio_client():
    c = Minio(
        "localhost:9000",
        access_key=settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.AWS_SECRET_ACCESS_KEY,
        secure=False,
    )

    try:
        c.make_bucket(BUCKET)
    except BucketAlreadyOwnedByYou:
        pass

    return c

@pytest.fixture
def minio(minio_server, minio_client):
    return minio_client

@pytest.fixture
@pytest.mark.django_db
def constants():
    call_command("loadconstants")


def test_can_store_to_minio(minio):
    """
    Simple test for checking if the way we start minio is working or not.
    """
    contents = "what"
    data = StringIO(contents)
    minio.put_object(BUCKET, "data", data, len(contents))

    object_contents = minio.get_object(BUCKET, "data").read()

    assert contents == object_contents


@pytest.mark.django_db
def test_file_stores_to_minio(minio, constants):
    contents = "random"
    realfile = DjangoFile(StringIO(contents), name="realfile.pdf")
    f = File(file_on_disk=realfile, file_format=FileFormat.objects.get(extension="pdf"))
    f.save()

    # check if we can fetch the object using the minio client
    obj = minio.get_object(
        settings.AWS_STORAGE_BUCKET_NAME,
        generate_object_storage_name(f.checksum, str(f))
    )
    assert obj.read() == contents
