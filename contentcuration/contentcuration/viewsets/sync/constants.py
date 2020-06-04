# Change type constants
CREATED = 1
UPDATED = 2
DELETED = 3
MOVED = 4
COPIED = 5
CREATED_RELATION = 6
DELETED_RELATION = 7

# Client-side table constants
CHANNEL = "channel"
CONTENTNODE = "contentnode"
CHANNELSET = "channelset"
ASSESSMENTITEM = "assessmentitem"
FILE = "file"
INVITATION = "invitation"
TREE = "tree"
USER = "user"
EDITOR_M2M = "editor_m2m"
VIEWER_M2M = "viewer_m2m"


ALL_TABLES = set(
    [CHANNEL, CONTENTNODE, ASSESSMENTITEM, CHANNELSET, FILE, TREE, INVITATION, USER]
)


# Using this as a workaround for not having a proper event source
# this key will hold events for propagation in redis
USER_CHANGES_PREFIX = "user_changes_{user_id}"
