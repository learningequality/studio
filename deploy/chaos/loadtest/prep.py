"""
THIS WILL CLEAR YOUR DATABASE AND FILL IT WITH TEST DATA!

Prepare the local database for load testing.

It does the following:
- Creates an admin user.
- Creates 1000 channels. Create 3 users for each channel, and assign 1 as the editor and the other two as viewers.
"""
import logging
import os
import subprocess
import sys
import warnings

# output any info logs
logging.basicConfig(level="INFO")

# set sys.path to include the contentcuration dir
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
cc_dir = os.path.join(root_dir, "contentcuration")
sys.path.append(cc_dir)

# set the settings module
os.putenv("DJANGO_SETTINGS_MODULE", "contentcuration.test_settings")

from django.core.management import call_command

from contentcuration.models import Channel, User

# CONSTANTS
NUM_CHANNELS = 1000
NUM_NODES_PER_CHANNEL = 500

from contentcuration.tests.utils import mixer

mixer.register(
    User,
    information="{}",
    content_defaults="{}",
    policies="{}"
)


if __name__ == "__main__":
    warnings.warn("THIS WILL CLEAR YOUR DATABASE AND FILL IT WITH TEST DATA!")
    logging.info("Clearing the DB")
    call_command("flush", "--noinput")

    # set up our DB from scratch and create our user
    logging.info("Setting up the database")
    call_command("setup")

    # create NUM_CHANNELS channels using mixer

    logging.info("Creating {} channels".format(NUM_CHANNELS))

    for _ in range(NUM_CHANNELS):
        editor = mixer.blend(User)
        c = mixer.blend(Channel)
        c.editors.add(editor)
        viewers = mixer.cycle(2).blend(User)
        for v in viewers:
            v.view_only_channels.add(c)
            v.save()
        c.save()

    # start the server in prod mode
    subprocess.call(["yarn", "run", "devserver"])
