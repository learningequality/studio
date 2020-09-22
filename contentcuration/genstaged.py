from contentcuration.models import Channel, ContentNode
c = Channel.objects.get(pk='b2b553e3f10f5ce580c261fe0d68104b')
c.staging_tree = ContentNode.objects.create(kind_id="topic", title="Test title")
print(c.__dict__)
c.save()
for i in range(0, 200):
  print("{}".format(i))
  ContentNode.objects.create(kind_id="topic", title="Test topic {}".format(i), parent_id=c.staging_tree.id)
