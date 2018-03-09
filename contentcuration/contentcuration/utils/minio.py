import atexit
import logging
import multiprocessing
import subprocess

logger = logging.getLogger(__name__)


def start_minio():
    """
    Start a minio subprocess, controlled by another thread.

    Returns the daemonized thread controlling the minio subprocess.
    """
    minio_process = multiprocessing.Process(target=_start_minio)
    minio_process.start()
    atexit.register(lambda: stop_minio(minio_process))
    return minio_process


def _start_minio():
    logger.info("Starting minio")

    MINIO_PROCESS = subprocess.Popen(
        ["run_minio.py"],
        stdin=subprocess.PIPE,
    )


def stop_minio(p):
    p.terminate()
