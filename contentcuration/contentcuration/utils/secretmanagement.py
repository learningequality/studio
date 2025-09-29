# Note: this module is imported inside settings.py! Make sure to avoid circular imports
import logging
import os

import six
from google.cloud import kms
from google.cloud.storage import Client
from google_crc32c import value as _crc32c

ENV_VARS = "ENV_VARS"
KMS_GCS = 2

SECRET_STORAGE_GCP_KMS_DEFAULT_LOCATION = "global"
SECRET_STORAGE_DEFAULT_ENVIRONMENT = "dev"


def get_secret(secret_name, secret_storage=None):
    """
    Return the secret value stored in the secret key called secret_name.

    The following secret storage locations are supported:
    - environment variables
    - Google Cloud Storage, encrypted with KMS

    If secret_storage is None (the default), then it will read the SECRET_STORAGE
    environment variable. If it's not defined, or the value is "ENV_VARS", then continue
    reading the secret from the environment variables, returning an empty string if
    that secret is not found.

    If the SECRET_STORAGE env var is defined and is set to "KMS_GCS", then it will download
    small files from GCS, decrypt them using GCloud KMS keys. You will need to make sure that
    the VM or environment has permission to access GCS and the KMS keys. You can do that by either
    running `gcloud auth login` on your local dev machine, or setting the right service account
    on your GCE VM.

    If you're using the KMS_GCS option, you will need to define the following additional environment variables.

    SECRET_STORAGE_GCP_PROJECT_ID: the env var to point to your GCP project ID where the secrets are stored.

    SECRET_STORAGE_ENVIRONMENT: Either one of dev, staging or prod. There are secrets specific to each environment
    that help isolate data to each environment. See the deploy/secretmanage executable found at the root of
    this repo. If not defined, this defaults to "dev".

    In addition, you can define an optional SECRET_STORAGE_GCP_KMS_LOCATION to point to the datacenter
     where your KMS keys live. If not defined, this defaults to 'global'. See GCloud KMS docs for more detail.
    """

    secret_storage = secret_storage or os.getenv("SECRET_STORAGE")

    if secret_storage in [None, "", ENV_VARS]:
        return os.getenv(secret_name)
    if secret_storage == "KMS_GCS":
        env = (
            os.getenv("SECRET_STORAGE_ENVIRONMENT")
            or SECRET_STORAGE_DEFAULT_ENVIRONMENT
        )
        project_id = os.getenv("SECRET_STORAGE_GCP_PROJECT_ID")
        kms_location = (
            os.getenv("SECRET_STORAGE_GCP_KMS_LOCATION")
            or SECRET_STORAGE_GCP_KMS_DEFAULT_LOCATION
        )

        if not project_id:
            raise KeyError(
                "The env variable SECRET_STORAGE_GCP_PROJECT_ID was not defined!"
            )

        ciphertext = get_encrypted_secret(secret_name, project_id, env)

        return decrypt_secret(ciphertext, project_id, kms_location, env, secret_name)
    logging.warning(
        "Invalid SECRET_STORAGE value! Defaulting to reading environment variables for now."
    )
    return os.getenv(secret_name)


def decrypt_secret(ciphertext, project_id, loc, env, secret_name):
    """
    Decrypt the ciphertext by using the GCloud KMS keys for that secret.
    """
    kms_client = kms.KeyManagementServiceClient()
    key_path = kms_client.crypto_key_path(project_id, loc, env, secret_name)

    # Optional, but recommended: compute ciphertext's CRC32C.
    # See crc32c() function defined below.
    ciphertext_crc32c = crc32c(ciphertext)

    response = kms_client.decrypt(
        request={
            "name": key_path,
            "ciphertext": ciphertext,
            "ciphertext_crc32c": ciphertext_crc32c,
        }
    )

    # Optional, but recommended: perform integrity verification on decrypt_response.
    # For more details on ensuring E2E in-transit integrity to and from Cloud KMS visit:
    # https://cloud.google.com/kms/docs/data-integrity-guidelines
    if not response.plaintext_crc32c == crc32c(response.plaintext):
        raise Exception(
            "The response received from the server was corrupted in-transit."
        )

    return response.plaintext


def get_encrypted_secret(secret_name, project_id, env):
    """
    Fetch the encrypted secret stored in project_id's secrets bucket. Return the encrypted string.

    Bucket names are globally unique. The secrets bucket for a project is called "{project_id}-secrets".

    Inside the bucket are folders corresponding to different environments; currently either dev, staging or
    prod. Inside each folder are files that are encrypted by GCloud KMS keys that are specific to that
    secret.
    """
    bucket_name = "{id}-secrets".format(id=project_id)
    loc = "{env}/{name}".format(env=env, name=secret_name)

    bucket = Client().get_bucket(bucket_name)

    try:
        ret = bucket.blob(loc).download_as_string()
    except AttributeError:
        logging.warning(
            "Secret '{name}' in env '{env}' does not exist! Defaulting to an empty string.".format(
                env=env, name=secret_name
            )
        )

    return ret


def crc32c(data):
    """
    Calculates the CRC32C checksum of the provided data.
    Args:
        data: the bytes over which the checksum should be calculated.
    Returns:
        An int representing the CRC32C checksum of the provided bytes.
    """
    return _crc32c(six.ensure_binary(data))
