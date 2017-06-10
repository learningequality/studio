# Util functions used by different Content Curation files
import newrelic.agent


def record_channel_action_stats(action_attributes):
    """
    :param action_attributes: The attributes of the current action.
    """
    if 'action' in action_attributes:
        newrelic.agent.record_custom_event("ChannelStats", params=action_attributes)
