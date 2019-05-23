# Studio Changelog

## Upcoming Release
#### Changes
*

#### Issues Resolved
*


## 2019-05-23 Release
#### Changes
* [@jayoshih] Updated README
* [@jayoshih] Vueified channel list page
* [@ivanistheone] Dockerfile fixes
* [@DXCanas] docker-compose setup for dev
* [@kollivier] Added Django debug toolbar profiling panel
* [@jonboiser] Added vue router to channel list page
* [@kollivier] Made default thumbnail aspect ratio 16:9
* [@micahscopes] Load jQuery on signup/policy pages
* [@kollivier] Restore thumbnail data to public channels API
* [@jayoshih] Updated le-utils with correct document thumbnail order
* [@jayoshih] Fixed channel page rendering issues
* [@kollivier] Added babel-polyfill to base JS module
* [@ivanistheone] Removed unused ricecooker code paths
* [@kollivier] Upgrade pip during Travis build
* [@rtibbles] Added vue sandbox mode
* [@aronasorman] Added probers
* [@kollivier] Moved publishing code to separate file
* [@aronasorman] Added celery dashboard
* [@bjester] Added pycharm settings
* [@lyw07] Implemented per PR continuous deployment system
* [@kollivier] Optimized channel load times by reducing queries
* [@kollivier] Removed unused constant queries
* [@nucleogenesis] Added slideshow import from Ricecooker & publish to Kolibri
* @jayoshih Removed broken garbage collection file


#### Issues Resolved
* [#875 Make sure files referenced by both orphan and non-orphan nodes aren't deleted](https://github.com/learningequality/studio/issues/875)
* [#1359 jQuery symbol ($) is missing on privacy policy and signup pages](https://github.com/learningequality/studio/issues/1359)
* [#1358 After signup, I'm not prompted to accept the privacy policy](https://github.com/learningequality/studio/issues/1358)
* [#1352 ReferenceError: 'Symbol' is undefined](https://github.com/learningequality/studio/issues/1352)
* [#1337 On channel details, channel name not getting set on ENTER](https://github.com/learningequality/studio/issues/1337)
* [#1336 On channel details, channel should have square thumbnail aspect ratio](https://github.com/learningequality/studio/issues/1336)
* [#1328 The PDF preview should default to "Document," not "Thumbnail"](https://github.com/learningequality/studio/issues/1328)
* [#1322 Rotating text "rotate_right" exist on Collection tab](https://github.com/learningequality/studio/issues/1322)
* [#1321 Collection channel list overlap](https://github.com/learningequality/studio/issues/1321)
* [#1320 Not able to download my own channel PDF details](https://github.com/learningequality/studio/issues/1320)
* [#1319 I can't delete my own channel](https://github.com/learningequality/studio/issues/1319)
* [#1299 Missing thumbnails in /api/public/v1/channels](https://github.com/learningequality/studio/issues/1299)
* [#1286 Default thumbnail background image produces an odd purple border on channel details modal](https://github.com/learningequality/studio/issues/1286)
* [#1269 Deleted channels appear in storage request form](https://github.com/learningequality/studio/issues/1269)
* [#1266 ContentNode Thumbnails different from the ones uploaded](https://github.com/learningequality/studio/issues/1266)
* [#1258 Error message when accepting invitation](https://github.com/learningequality/studio/issues/1258)
* [#920 Add ajaxError handler so we get better Sentry errors for API calls](https://github.com/learningequality/studio/issues/920)
* [#1193 images are not loading](https://github.com/learningequality/studio/issues/1193)
* [#905 Error: ResizeObserver loop limit exceeded](https://github.com/learningequality/studio/issues/905)
* [#875 Make sure files referenced by both orphan and non-orphan nodes aren't deleted](https://github.com/learningequality/studio/issues/875)
* [#900 TypeError: Cannot read property 'set_active_channel' of undefined](https://github.com/learningequality/studio/issues/900)


## 2019-03-11 Release
#### Changes
* [[@jayoshih](https://github.com/jayoshih)] Don't allow users to set prerequisites on topics
* [[@jayoshih](https://github.com/jayoshih)] Removed deleted channels from storage request list

#### Issues Resolved
* [#1254](https://github.com/learningequality/studio/issues/1254)
* [#1269](https://github.com/learningequality/studio/issues/1269)


## 2019-02-11 Release
#### Changes
* [[@kollivier](https://github.com/kollivier)] Fix issue with channel content defaults only supporting English characters.
* [[@kollivier](https://github.com/kollivier)] Sort countries by localized country name.
* [[@jayoshih](https://github.com/jayoshih)] Added banner to redirect users from contentworkshop.learningequality.org to studio.learningequality.org
* [[@benjaoming](https://github.com/benjaoming)] Moved Read the Docs out of main repo
* [[@jayoshih](https://github.com/jayoshih)]Allow users to access invitations when they have access to the channel



#### Issues Resolved
* [#1004](https://github.com/learningequality/studio/issues/1004)
* [#976](https://github.com/learningequality/studio/issues/976)
* [#1094](https://github.com/learningequality/studio/issues/1094)


## 2019-02-06 Release
#### Changes
* [[@kollivier](https://github.com/kollivier)] Improve Sentry error reporting for 404s and network errors.
* [[@micah](https://github.com/micahscopes)] Fixed a bug where Vue-based modals weren't closing properly
* [[@kollivier](https://github.com/kollivier)] Fixed a HTML5 app preview bug by updating le-utils.
* [[@jayoshih](https://github.com/jayoshih)] Added saving indicator for move operations
* [[@jayoshih](https://github.com/jayoshih)] Automatically start html when preview tab is opened
* [[@jayoshih](https://github.com/jayoshih)] Pause videos and audios when preview tab is closed
* [[@jayoshih](https://github.com/jayoshih)] Update gcs storage to handle opening legacy files from the server
* [[@jayoshih](https://github.com/jayoshih)] Added Save & Close option to channel collections
* [[@jayoshih](https://github.com/jayoshih)] Fixed editors/viewers icons displaying incorrectly
* [[@kollivier](https://github.com/kollivier)] Remove div tags from markdown output.
* [[@micahscopes](https://github.com/micahscopes)] Ensure that the move modal dialog closes properly
* [[@jayoshih](https://github.com/jayoshih)] Force pdf exports to use Arial font file to fix blank pdfs
* [[@micahscopes](https://github.com/micahscopes)] Fixed the restore button in the trash modal
* [[@jayoshih](https://github.com/jayoshih)] Fixed problems with uploading subtitles
* [[@jayoshih](https://github.com/jayoshih)] Fixed problems with removing files
* [[@jayoshih](https://github.com/jayoshih)] Only validate when user clicks save
* [[@jayoshih](https://github.com/jayoshih)] Minor styling fixes
* [[@jayoshih](https://github.com/jayoshih)] Fixed offline js overlay
* [[@jayoshih](https://github.com/jayoshih)] Switch admin page get_channel_kind_count to use get_node_details instead
* [[@micahscopes](https://github.com/micahscopes)] Fixed scrolling in the channel list view
* [[@jayoshih](https://github.com/jayoshih)] Made channel bundles GDPR-compliant
* [[@jayoshih](https://github.com/jayoshih)] Fixed topic tree layout issues
* [[@jayoshih](https://github.com/jayoshih)] Disabled channel metadata editing for ricecooker channels
* [[@jayoshih](https://github.com/jayoshih)] Made header responsive
* [[@jayoshih](https://github.com/jayoshih)] Fixed RuntimeError on naive datetime in exportchannel
* [[@jayoshih](https://github.com/jayoshih)] Fixed `modified` getting added into setting node.changed
* [[@jayoshih](https://github.com/jayoshih)] Made channel metadata updates mark node as changed
* [[@jayoshih](https://github.com/jayoshih)] Fixed channel detail exporting filename bug
* [[@kollivier](https://github.com/kollivier)] Fix issue with English po generated by makemessages
* [[@jayoshih](https://github.com/jayoshih)] Fixed login screen layout
* [[@jayoshih](https://github.com/jayoshih)] Disabled prerequisite selection from garbage tree
* [[@jayoshih](https://github.com/jayoshih)] Turned off offline.js when in debug mode
* [[@jayoshih](https://github.com/jayoshih)] Added ppt export on channel details
* [[@jayoshih](https://github.com/jayoshih)] Added two pdf export options on channel details
* [[@jayoshih](https://github.com/jayoshih)] Added csv export on channel details
* [[@jayoshih](https://github.com/jayoshih)] Added a changelog


#### Issues Resolved
* [#1050](https://github.com/learningequality/studio/issues/1050)
* [#728](https://github.com/learningequality/studio/issues/728)
* [#1194](https://github.com/learningequality/studio/issues/1194)
* [#1199](https://github.com/learningequality/studio/issues/1199)
* [#975](https://github.com/learningequality/studio/issues/975)
* [#986](https://github.com/learningequality/studio/issues/986)
* [#1118](https://github.com/learningequality/studio/issues/1118)
* [#1174](https://github.com/learningequality/studio/issues/1174)
* [#679](https://github.com/learningequality/studio/issues/679)
* [#952](https://github.com/learningequality/studio/issues/952)
* [#1175](https://github.com/learningequality/studio/issues/1175)
* [#1018](https://github.com/learningequality/studio/issues/1018)
* [clearinghouse/#245](https://github.com/learningequality/clearinghouse/issues/245)
* [#1165](https://github.com/learningequality/studio/issues/1165)
