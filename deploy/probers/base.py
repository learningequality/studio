import datetime


class BaseProbe(object):

    metric = "STUB_METRIC"

    def do_probe(self):
        pass

    def run(self):
        start_time  = datetime.datetime.now()

        ret = self.do_probe()

        end_time  = datetime.datetime.now()
        elapsed = (end_time - start_time).total_seconds() * 1000

        print("{metric_name} {latency_ms}".format(
            metric_name=self.metric,
            latency_ms=elapsed))
