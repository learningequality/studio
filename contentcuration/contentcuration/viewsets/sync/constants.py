# Change type constants
CREATED = 1
UPDATED = 2
DELETED = 3
MOVED = 4
COPIED = 5
PUBLISHED = 6
SYNCED = 7
DEPLOYED = 8


ALL_CHANGES = set([
    CREATED,
    UPDATED,
    DELETED,
    MOVED,
    COPIED,
    PUBLISHED,
    SYNCED,
    DEPLOYED,
])

# Client-side table constants
BOOKMARK = "bookmark"
CHANNEL = "channel"
CONTENTNODE = "contentnode"
CONTENTNODE_PREREQUISITE = "contentnode_prerequisite"
CHANNELSET = "channelset"
ASSESSMENTITEM = "assessmentitem"
FILE = "file"
INVITATION = "invitation"
USER = "user"
EDITOR_M2M = "editor_m2m"
VIEWER_M2M = "viewer_m2m"
SAVEDSEARCH = "savedsearch"
CLIPBOARD = "clipboard"


ALL_TABLES = set(
    [
        BOOKMARK,
        CHANNEL,
        CLIPBOARD,
        CONTENTNODE,
        CONTENTNODE_PREREQUISITE,
        ASSESSMENTITEM,
        CHANNELSET,
        FILE,
        INVITATION,
        USER,
        SAVEDSEARCH,
        EDITOR_M2M,
        VIEWER_M2M,
    ]
)


# Key to use for whether a node is currently copying
COPYING_FLAG = "__COPYING"
# Key for tracking id of async task that is relevant to this indexedDB row
TASK_ID = "__TASK_ID"
