from django.contrib.auth.models import User
from django.db import models
from contentcuration.models import ContentNode, Channel
from contentcuration.signals import changed_tree, channel_updated
from .search_indexes import ContentNodeIndex, ContentNodeChannelInfo
from haystack.utils import get_identifier
from celery_haystack import signals


actively_indexed_models = [ContentNode, Channel]
class StudioSignalProcessor(signals.CelerySignalProcessor):
    def setup(self):
        for model in actively_indexed_models:
            models.signals.post_save.connect(self.enqueue_save, sender=model)
            models.signals.post_delete.connect(self.enqueue_delete, sender=model)

        channel_updated.connect(self.enqueue_update_channel_tree, sender=Channel)
        changed_tree.connect(self.enqueue_changed_tree, sender=ContentNode)


    def teardown(self):
        for model in actively_indexed_models:
            models.signals.post_save.disconnect(self.enqueue_save, sender=model)
            models.signals.post_delete.disconnect(self.enqueue_delete, sender=model)

        channel_updated.disconnect(self.enqueue_update_channel_tree, sender=Channel)
        changed_tree.disconnect(self.enqueue_changed_tree, sender=ContentNode)


    def enqueue_update_channel_tree(self, sender, channel, **kwargs):
        # update indexes for for each of this channel's content trees
        for tree in channel.all_trees():
            if tree:
                self.enqueue('update_channel_info', tree, ContentNode, **kwargs)

    def enqueue_changed_tree(self, sender, contentnode, **kwargs):
        return self.enqueue('update_channel_info', contentnode, sender, **kwargs)
