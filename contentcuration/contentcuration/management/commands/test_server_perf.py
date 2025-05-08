from django.core.management.base import BaseCommand

from contentcuration.perftools import objective


class Command(BaseCommand):

    help = "Runs db tests and reports the performance results. (Usage: test_server_perf [num_objects=100])"

    def add_arguments(self, parser):
        pass
        # ID of channel to read data from
        parser.add_argument("--num_objects", type=int, default=100)

        # ID of channel to write data to (can be same as source channel)
        parser.add_argument("--stress-test", action="store_true", default=False)

    def handle(self, *args, **options):
        objects = None
        try:
            objects = objective.Objective()

            stats = {}
            num_objects = options["num_objects"]
            num_runs = 10
            object_types = ["ContentNode", "File"]
            for object_type in object_types:
                stats[object_type] = objects.get_object_creation_stats(
                    object_type, num_objects, num_runs
                )

            stats[
                "ContentNode-mptt-delay"
            ] = objects.get_object_creation_stats_mptt_delay(num_objects, num_runs)
            object_types.append("ContentNode-mptt-delay")

            print()
            print("Test results:")
            for object_type in object_types:
                run_stats = stats[object_type]
                print(
                    "Stats for creating {} {} objects over {} runs: {}".format(
                        num_objects, object_type, num_runs, run_stats
                    )
                )

            if options["stress_test"]:
                print(  # noqa: T201
                    "Running stress test simulating creation / cloning of a channel like KA, "
                    "this will take at least several minutes. Please do not interrupt if possible!"
                )
                stats = objects.get_large_channel_creation_stats()
                for stat in stats:
                    print("{}: {}".format(stat, stats[stat]))

        finally:
            if objects:
                objects.cleanup()
