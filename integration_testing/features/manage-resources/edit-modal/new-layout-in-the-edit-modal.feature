Feature: New layout in the edit modal
	User can see new fields: learning level, learning activity, what you will need, duration, completion, for beginners, accessibility, and category

	Background:
		Given I am signed into Studio
			And I am in an editable channel
			And I have added resources of type mp3, bloompub, bloomd, pdf, epub, h5p, mp4, webm, zip, kpub to the channel

	Scenario: View .PDF/.EPUB/.KPUB/.BLOOMPUB/.BLOOMD  layout
		When I right click a .PDF/.EPUB/.KPUB/.BLOOMPUB/.BLOOMD resource
		Then I see an options menu for that .PDF/.EPUB/.KPUB/.BLOOMPUB/.BLOOMD
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a bookmark icon and a label *Document*
			And I see the resource thumbnail
			And I see the *Preview files* options
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *Requirements*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Completion* and a *Duration* drop-downs and a *Minutes* slider
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox
			And I see the *Accessibility* section
			And I see the following checkboxes there: *Includes alternative text description for images*, *Includes high contrast display for learners with low vision*, *Tagged PDF*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*

	Scenario: View .MP3 layout
		When I right click an .MP3 resource
		Then I see an options menu for that .MP3
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a music note icon and a label *Audio*
			And I see an audio player
			And I see a *Preview files* option
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *Requirements*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Completion and a *Duration* drop-down
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*
			And I see the *Captions and subtitles* section
			And I see the *Add captions* link

	Scenario: View .MP4 / .MOV layout
		When I right click an .MP4 or .MOV resource
		Then I see an options menu for that .MP4 or .MOV
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a play icon and a label *Video*
			And I see an video player
			And I see a *Preview files* options
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *Requirements*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Completion* and a *Duration* drop-down
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox
			And I see the *Accessibility* section with the following checkboxes: *Includes captions or subtitles*, *Includes audio descriptions*, *Includes sign language captions*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*

	Scenario: View *Practice* resource layout
		When I right click a *Practice* resource
		Then I see an options menu for that *Practice* resource
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *Requirements*, *Tags*, and *Category*
			And I see the *Assessment options* section
			And I see a *Randomize question order for learners*
			And I see the *Completion* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see the following fields: *Completion*, *Goal*
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox
			And I see the *Accessibility* section with the following checkbox: *Includes alternative text descriptions for images*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*

	Scenario: View .ZIP resource layout
		When I right click a *.ZIP* resource
		Then I see an options menu for that *.ZIP* resource
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a hand icon and a label *Explore*
			And I see a thumbnail
			And I see a *Preview files* option
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *Requirements*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see the *Completion* drop-down with prefilled *When time spent is equal to duration* value
			And I see the *Duration* drop-down and the *Minutes* drop-down
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox
			And I see the *Accessibility* section with the following checkboxes: *Includes alternative text descriptions for images*, *Includes high contrast text for learners with low vision*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*
