from django.core.management.base import BaseCommand

from contentcuration.utils.export_writer import ChannelDetailsCSVWriter
from contentcuration.utils.export_writer import ChannelDetailsPDFWriter
from contentcuration.utils.export_writer import ChannelDetailsPPTWriter

IMPLEMENTED_FORMATS = ["pdf", "ppt", "csv"]


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)
        parser.add_argument('format', type=str, help="FORMAT=[csv, pdf, ppt]")
        parser.add_argument('--condensed', action='store_true', dest='condensed', default=False)

    def handle(self, *args, **options):
        options['format'] = options['format'].lower()

        if options['format'] == "pdf":
            writer = ChannelDetailsPDFWriter([options['channel_id']], condensed=options.get('condensed'))
        elif options['format'] == 'ppt':
            writer = ChannelDetailsPPTWriter([options['channel_id']])
        elif options['format'] == 'csv':
            writer = ChannelDetailsCSVWriter([options['channel_id']])
        else:
            raise NotImplementedError("{} has not been implemented (supported formats:{})".format(options['format'], IMPLEMENTED_FORMATS))

        filepath = writer.write()
        print "Generated {}".format(filepath)
