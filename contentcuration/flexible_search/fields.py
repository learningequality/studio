from haystack import indexes

class ChannelIdField(indexes.CharField):
    def __init__(self, **kwargs):
        kwargs['default'] = '-1'
        super(indexes.CharField, self).__init__(**kwargs)

    def prepare(self, obj):
        return str(obj.id)

