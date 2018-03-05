API Endpoints
=============


Public API
----------
For public channel listing API info, see this doc:
https://docs.google.com/document/d/1XKXQe25sf9Tht6uIXvqb3T40KeY3BLkkexcV08wvR9M/edit



Self-documenting API
--------------------
When running the Kolibri Studio on your machine, you can browse the API docs
by going to the API Root URL: http://127.0.0.1:8000/api/



Sushibar-related endpoints
--------------------------

### api/internal/publish_channel  
Publish a channel (makes it exportable to Kolibri)  

    POST api/internal/publish_channel
    { 
      "channel_id": "{uuid.hex}"
    }  

Response

    {  
      "channel": "channel_id",  
      "success": True  
    }  


### get_user_channels/  
Returns serialized json string of all channels associated with user (view-only and edit access)  

    GET get_user_channels/  
    Header:  
    { "Authorization": "Token {token}"}
    Body: ---  

Response is a serialized channel list


### api/internal/check_user_is_editor  
Returns whether or not user is authorized to edit the channel  

    POST  
    Header:  
    { "Authorization": "Token {token}"}  
    Body:  
    { "channel_id" : "{uuid.hex}"}  

Response:

    {  
      "success" : True  
    }  

(returns 403 if not authorized)  



### api/internal/authenticate_user_internal
Attempts to log user in based on token, throws 400 error if user token is invalid  

    POST  api/internal/authenticate_user_internal  
    Header:  
    { "Authorization": "Token {token}"}  
    Body: ---  

Response

    {  
      "success" : True,  
      "username" : "{username}"  
    }


### api/internal/check_version  
Determines whether status of ricecooker is up-to-date (includes soft warnings, hard warnings, and errors)  

    POST  api/internal/check_version
    Header:  
    {"Authorization": "Token {token}"}  
    Body:  
    {"version" : "{ricecooker version}"}  

Response:

    {  
    "success" : True,  
    "status" : "{status const}",  
    "message" : "{str}"  
    }  


### api/internal/file_diff  
Indicates which files in a list are not on the server  

    POST  api/internal/file_diff  
    Header:  
    {"Authorization": "Token {token}"}  
    Body:   
    [List of filenames] (e.g. ["abc.mp4", "def.png"])  

Response

    [List of files not in storage]  

(e.g. ["abc.mp4"])  


### api/internal/file_upload  
Uploads a file to the content curation storage  

    POST  api/internal/file_upload  
    Header:  
    {"Authorization": "Token {token}"}  
    Body: ---  
    FILES: FileObject to upload  

Response:

    {  
      "success" : True  
    }  

(throws SuspiciousOperation error if checksum is invalid)  



### api/internal/create_channel  
Creates channel based on the passed in channel data and returns the root node's id for the chef tree  

    POST  api/internal/create_channel  
    Header:  
    { "Authorization": "Token {token}"}  
    Body:   
    {"channel_data": channel data}  

Response:

    {  
    "success": True,  
    "root": "{chef_tree id}",  
    "channel_id": "{uuid.hex}"  
    }  


### api/internal/add_nodes  
Adds nodes to tree with corresponding parent  

    POST api/internal/add_nodes  
    Header:  
    {"Authorization": "Token {token}"}
    Body:  
    {  
      "content_data" : [node data],  
      "root_id" : "{parent id}"  
    }

Response:

    {  
    "success": True,  
    "root_ids": "{node_id<\>id}"  
    }  
  
Example:  

    {  
    "success": True,  
    "root_ids": "{abc: def}"  
    }   
where abc is the node id, and def is the cc node's primary key  


### api/internal/finish_channel  
Moves chef tree to either staging tree or main tree depending on user specification  

    POST  api/internal/finish_channel  
    Header:  
    {"Authorization": "Token {token}"}  
      
    Body:  
    {  
    "channel_id" : "{uuid.hex}",  
    "stage" : {boolean}  
    }  

Response:

    {  
    "success": True,  
    "new_channel": "{uuid.hex}"  
    }  



### api/internal/activate_channel_internal  
Deploys a staged channel to the live channel  

    POST api/internal/activate_channel_internal  
    Header: ---  
    Body:  
    {"channel_id": "{uuid.hex}"}  

Response:

    {  
      "success": True  
    }  


### api/internal/get_staged_diff_internal  
Returns a list of changes between the main tree and the staged tree (Includes date/time created, file size, \# of each content kind, \# of questions, and \# of subtitles)  

    POST  api/internal/get_staged_diff_internal  
    Header: ---  
    Body:  
    {"channel_id": "{uuid.hex}"}  


Returns list of json changes. Example:  

    [  
      {  
      "field" : "File Size",  
      "live" :  100 (\# bytes),  
      "staged" : 200 (\# bytes),  
      "difference" : 100,  
      "format_size" : True  
      }  
    ]  


### api/internal/compare_trees  
Returns a dict of new nodes and deleted nodes between either the staging tree or main tree and the previous tree (use staging flag to indicate whether to use staging or main)  

    POST  api/internal/compare_trees
    Header: ---  
    Body:  
    {  
      "channel_id": "{uuid.hex}",  
      "staging": boolean  
    }  
  

Response:

    {  
      "success" : True,  
      "new" : {  
        "{node_id}" : {  
          "title" : "{str}",  
          "kind" : "{str}",  
          "file_size" : {number}  
        },  
      },  
      "deleted" : {  
          "{node_id}" : {  
          "title" : "{str}",  
          "kind" : "{str}",  
          "file_size" : {number}  
        }  
      }  
    }  
  
Example:  

    {  
      "success" : True,  
      "new" : {  
        "aaa" : {  
          "title" : "Node Title",  
          "kind" : "topic",  
          "file_size" : 0  
        },  
        "bbb" : {  
          "title" : "Node Title 2",  
          "kind" : "audio",  
          "file_size" : 100  
        }  
      },  
      "deleted" : {  
        "ccc" : {  
          "title" : "Node Title 3",  
          "kind" : "video",  
          "file_size" : 999999  
        }  
      }  
    }  


### api/internal/get_tree_data  
Returns a simplified dict of the specified tree  

    POST  
    Header: ---  
    Body:  
    {  
    "channel_id": "{uuid.hex}",  
    "tree": "{str}"  
    }  
    Tree can be "main", "chef", "staging", or "previous"  
      
Response:

    {  
      "success" : True,  
      "tree" : [list of node dicts]  
    }  
      

Example of tree:

    [  
      {  
        'kind': 'topic',  
        'title': 'Topic',  
        'children': [  
          {  
            'kind': 'exercise',   
            'title': 'Exercise'  
            'count': 2  
          }  
        ]  
      },  
      {  
        'kind': 'html5',   
        'title': 'HTML Title',  
        'file_size': 145990  
      },  
    ]  


### /api/internal/get_channel_status_bulk   
Returns status for a list of `channel_id`s
  
    Body:  
    {"channel_ids": ["9729640dc9d25b1da18d07343416f9bd"]}  

Response:

    {
      "statuses":{
          "9729640dc9d25b1da18d07343416f9bd": "staged"
      },
      "success": true
    }



All endpoints
-------------
See this document for the full list of Studio API endpoints:
https://docs.google.com/spreadsheets/d/181hSEwJ7yVmMh7LEwaHENqQetYSsbSDwybHTO_0zZM0/edit?usp=sharing

