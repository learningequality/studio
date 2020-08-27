import os

import gevent
from locust.env import Environment
from locust.event import EventHook
from locust.log import setup_logging
from locust.stats import stats_printer
from locustfile import StudioDesktopBrowserUser

log_file = os.path.abspath("test_logs.txt")
# this avoids massive log files after many runs. If you want to save a run,
# please rename this file.
if os.path.exists(log_file):
    os.remove(log_file)

setup_logging("INFO", log_file)

failure_hook = EventHook()

# setup Environment and Runner
env = Environment(user_classes=[StudioDesktopBrowserUser])
env.create_local_runner()

# start a WebUI instance
env.create_web_ui("127.0.0.1", 8089)

# start a greenlet that periodically outputs the current stats
gevent.spawn(stats_printer(env.stats))

# start the test
env.runner.start(50, hatch_rate=10)

# in 60 seconds stop the runner
gevent.spawn_later(60, lambda: env.runner.quit())

# wait for the greenlets
env.runner.greenlet.join()

# stop the web server for good measures
env.web_ui.stop()
