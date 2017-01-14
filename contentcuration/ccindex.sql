CREATE INDEX channel_user ON contentcuration_channel_editors(user_id);
CREATE INDEX user_channel ON contentcuration_channel_editors(channel_id);
CREATE INDEX node_tree ON contentcuration_contentnode(tree_id);
CREATE INDEX parentroot ON contentcuration_contentnode(parent_id);
CREATE INDEX referenced_node ON contentcuration_file(contentnode_id);
CREATE INDEX content_tag ON contentcuration_contentnode_tags(contentnode_id);
CREATE INDEX contentnode_exercise ON contentcuration_assessmentitem(contentnode_id);
CREATE INDEX channel_deleted ON contentcuration_channel(deleted);
