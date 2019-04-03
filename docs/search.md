Studio Search
=============


Quickstart
----------
  - Git checkout the branch micahscopes:elasticsearch-backend
  - run `make dcbuild`  (warning this can take hours since rebuilds all the images + runs yarn install + pip install several times)
  - run `sudo sysctl -w vm.max_map_count=262144` to make sure your system gives the elasticsearch container adequate memory.
  - run `make dcup`
  - Go to `localhost:8080` and login as `a@a.com` as usual



URLs
----
The base URL for the search service is at http://localhost:8080/api/flexible_search/


Examples search queries:
  - Find all nodes that "video" in title:
    http://localhost:8080/api/flexible_search/content/?title=video
  - Same as above but return only results in `main_tree`
    http://localhost:8080/api/flexible_search/content/?title=video&in_channel_tree=main_tree
  - Find all topic nodes
    http://localhost:8080/api/flexible_search/content/?title=Ricecooker&content_kind=topic
  - Search for "HTML" within channel id `66a31fdbdd745c7c9e499206f3c4cced`:
    http://localhost:8080/api/flexible_search/content/?title=HTML&channel_pk=66a31fdbdd745c7c9e499206f3c4cced

To see the full list of "facets" available see the `search_fields` attribute on
the serializer --- two implementations possible. Note these fields need not be
the same as the model fields (e.g. `channel_pk` is available directly on content nodes).

Note the field `text` within the index will contain title + description + fulltext
and all attributes (not currently exposed through search interface).
In the long term this is the field we should query to find ALL results (i.e. not just title matches).




Management commands
-------------------
To completely rebuild index:
1. First get a command prompt within the studio-app container `make dcshell`
2. Run the command `contentcuration/manage.py rebuild_index --verbosity=2`
   for more info about this command see the [docs][2]

There is also the command `clear_index` and `update_index` ([docs][3])
The effect of `rebuild_index` is the same as `clear_index` followed by `update_index`.

The command `contentcuration/manage.py haystack_info` prints some useful info
about the Index classes associated with the Django models:
```
Number of handled 2 index(es).
  - Model: Channel by Index: <flexible_search.search_indexes.ChannelIndex>
  - Model: ContentNode by Index: <flexible_search.search_indexes.ContentNodeIndex>
```


Search backend
--------------
ElasticSearch (henceforth ES) is a search appliance with it's own data store.
We do not access ES directly, but instead rely on the Haystack library for
all interfacing (bulk indexing, index updates, and querying).

The following commands can be used for debugging/under-the-hood view:

  - GET http://localhost:9200/ (basic info about the ES appliance)
  - GET http://localhost:9200/haystack (our index is called `haystack`)
  - Basic search:
    - GET http://localhost:9200/haystack/_search?q=video
      (more info about the raw ElasticSearch search API [here](https://www.elastic.co/guide/en/elasticsearch/reference/5.5/_the_search_api.html#_the_search_api))
    - POST http://localhost:9200/haystack/_search
      ```bash
      curl -X POST "localhost:9200/haystack/_search?pretty" -H 'Content-Type: application/json' -d' { "query": { "match_all": {} }, "sort": [ { "content_kind": "asc" } ] } '
      ```




Search libraries
----------------

  - `django-haystack` = High-level search library with swappable backends.
     Includes the low level client `elasticsearch`. The current release of haystack
     is 2.8.1 and it doesn't support ES5 (or 6 or 7):
     - https://github.com/django-haystack/django-haystack/issues/1383
     - Upcoming release will support ES5
       https://github.com/django-haystack/django-haystack/blob/master/docs/changelog.rst

  -  `django-haystack-elasticsearch5` = temporary hack needed to support ES5
    See: https://github.com/Alkalit/haystack-elasticsearch5

  - `drf-haystack`: library aiming to simplify using Haystack with Django REST Framework

  - `celery_haystack` (source included in studio -- used for integration with 
    celery tasks `celery_haystack.handler.CeleryHaystackSignalHandler` and
    `celery_haystack.indexes.CelerySearchIndex`



Code
----
See the [`flexible_search/`][4] django app folder for all the new search code:
  - [`search_indexes.py`][5] = defines fields that will be indexed (a bit like an ORM but specific for search)
  - `views.py`: search backend leveraging the haystack features
  - `partial_update.py` specialized code to handle channel-info-only-change updates efficiently
  - `search_signals.py` define signal processors to handle updating search indexes
  - `templates/search/indexes/contentcuration/contentnode_text.txt` template used
    to feed the `text` field (combined search of title + description + full text)



Productionization
-----------------
The k8s setup for the new search prototype requires at two new k8s pods: one for
the ElasticSearch app (Java, lots of RAM) and one for the indexing worker (similar
to our regular celery worker, but may want to deploy separately to avoid conflicts).


### Single-node for testing:
  - Just run docker image `elasticsearch:5.6` as a single pod
  - Add another pod for the indexing worker
  - We don't care if we lost the pods or the data—since we can always rebuild


### ES Cluster setup:
The following options describe how to setup a multi-node ES cluster, which might
be necessary in the long term for higher performance (at much increase complexity):

Option A: using k8s setup (Deployment + StatefulSet)
  - https://medium.com/google-cloud/a-guide-to-deploy-elasticsearch-cluster-on-google-kubernetes-engine-52f67743ee98
  - https://code972.com/blog/2019/04/117-running-elasticsearch-on-kubernetes

Option B: using ECK k8s deployment helpers (alpha quality) 
  - https://www.elastic.co/blog/announcing-elastic-cloud-on-kubernetes-eck-0-9-0-alpha-2
  - https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-quickstart.html

Option C: using a HELM chart (only supports ES6 and ES7; not ES5)
  - Old: https://github.com/helm/charts/tree/master/stable/elasticsearch
  - New: https://github.com/elastic/helm-charts/tree/master/elasticsearch




Next steps
----------
Here are some possible next steps:
[ ] Rename `search` as `oldsearch` (requires changes to frontend too)
[ ] Rename `flexible_search` to `search`
[ ] Setup k8s pod for ElasticSearch (specific image `elasticsearch:5.6`)
[ ] Setup k8s pod for new celery indexing worker
[ ] Rebase search prototype branch to latest develop
[ ] Get a Studio demoserver running from the with search enables
[ ] Start working on frontend




Old search code
---------------
Studio already supports basic search functionality based on DB queries:

  - Content node search:
    http://localhost:8080/api/search/items/?q=Video
    see [code here](https://github.com/learningequality/studio/blob/develop/contentcuration/search/views.py#L25-L40)

  - Topic node search, e.g. http://localhost:8080/api/search/topics/?q=Topic%204
    see [code here](https://github.com/learningequality/studio/blob/develop/contentcuration/search/views.py#L43-L56)

These endpoints are used for:
  - Import from CHANNEL modal
  - ?






[1]: https://github.com/micahscopes/studio/blob/elasticsearch-backend/contentcuration/flexible_search/views.py
[2]: https://django-haystack.readthedocs.io/en/master/management_commands.html#rebuild-index
[3]: https://django-haystack.readthedocs.io/en/master/management_commands.html#update-index
[4]: https://github.com/micahscopes/studio/tree/elasticsearch-backend/contentcuration/flexible_search
[5]: https://github.com/micahscopes/studio/blob/elasticsearch-backend/contentcuration/flexible_search/search_indexes.py

