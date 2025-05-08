import sys
import time

from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import File

# TODO: Investigate more precise timing libraries


def print_progress(text):
    sys.stdout.write("\r" + text)
    sys.stdout.flush()


class Objective:
    """
    Objective is a class that provides tools for measuring and exploring the performance impacts of performing
    various operations on ORM objects.
    """

    def __init__(self):
        self.topic, topic_created = ContentKind.objects.get_or_create(kind="Topic")
        self.root_node = ContentNode.objects.create(
            title="test_server_perf Root Node", kind=self.topic
        )

    def __del__(self):
        if self.root_node:
            raise Exception(
                "Test cleanup not run. Ensure you manually delete root node with id {} and all nodes and files that are connected to it.".format(
                    self.root_node.pk
                )
            )

    def cleanup(self):
        print("Performing clean up, please wait...")  # noqa: T201
        try:
            if self.root_node:
                files = File.objects.filter(contentnode=self.root_node)
                if files:
                    files.delete()

                self.root_node.delete()
                self.root_node = None
        except Exception:
            if self.root_node:
                print(  # noqa: T201
                    "Error in cleanup. Root node with id {} may still exist.".format(
                        self.root_node.pk
                    )
                )
            raise

    def create_content_nodes(self, num_nodes=100):
        """
        Creates the specified number of ContentNode objects, and returns the time taken.

        :param num_nodes: Number of nodes to create.
        :return: Time taken in seconds to perform the operation.
        """

        # Allow calling this method multiple times
        current_nodes = ContentNode.objects.count()
        parent = self.root_node

        start = time.time()
        for i in range(num_nodes):
            node = ContentNode.objects.create(
                title="test_server_perf Node {}".format(i),
                parent=parent,
                kind=self.topic,
            )
            # try to create a multi-level tree structure to better test tree recalc operations
            if num_nodes > 20:
                if i % (num_nodes / 10) == 0:
                    sys.stdout.write(".")
                    sys.stdout.flush()
                    parent = node

        elapsed = time.time() - start
        if ContentNode.objects.count() != current_nodes + num_nodes:
            raise AssertionError
        return elapsed

    def create_files(self, num_files=100):
        """
        Create File database objects.

        :param num_files: Number of File database objects to create
        :return: Time taken in seconds to perform the operation.
        """
        current_files = File.objects.count()

        start = time.time()
        for i in range(num_files):
            _ = File.objects.create()

        elapsed = time.time() - start
        if File.objects.count() != current_files + num_files:
            raise AssertionError
        return elapsed

    def get_object_creation_stats(self, object_type, num_objects=100, num_runs=10):
        """
        Runs the create_content_nodes logic multiple times and reports the min, max and avg times the operation takes.

        :param object_type: Type of object, can be "ContentNode" or "File"
        :param num_nodes: Number of nodes to create each run
        :param num_runs: Number of time to run the function
        :return: A dictionary with keys 'min', 'max', 'average', representing reported times.
        """

        creation_func = self.create_content_nodes

        if object_type == "File":
            creation_func = self.create_files

        run_times = []
        for i in range(num_runs):
            print_progress(
                "Creating {} {} objects. Test run {} of {}".format(
                    num_objects, object_type, i + 1, num_runs
                )
            )
            run_times.append(creation_func(num_objects))

        return self._calc_stats(run_times, num_objects)

    def get_object_creation_stats_mptt_delay(self, num_objects=100, num_runs=10):
        """
        Creates the specified number of ContentNode objects within a dleay_mptt_updates block, and returns the time taken.

        :param num_nodes: Number of nodes to create each run
        :param num_runs: Number of time to run the function
        :return: A dictionary with keys 'min', 'max', 'average', representing reported times.
        """
        run_times = []

        for i in range(num_runs):
            print_progress(
                "Creating {} {} objects with delay_mptt_updates. Test run {} of {}".format(
                    num_objects, "ContentNode", i + 1, num_runs
                )
            )
            with ContentNode.objects.delay_mptt_updates():
                run_times.append(self.create_content_nodes(num_objects))

        return self._calc_stats(run_times, num_objects)

    def get_large_channel_creation_stats(self):
        # Let's use the stats from KA as a base
        num_nodes = 44000
        num_files = num_nodes * 3

        stats = {}
        stats["Node creation time"] = self.get_object_creation_stats_mptt_delay(
            num_nodes, num_runs=1
        )["min"]
        stats["File creation time"] = self.create_files(num_files)

        return stats

    def _calc_stats(self, run_times, num_items):
        run_times.sort()
        total_time = 0
        for run_time in run_times:
            total_time += run_time
        average = total_time / len(run_times)

        return {
            "min": run_times[0],
            "max": run_times[-1],
            "average": average,
            "per_record_average": average / num_items,
        }
