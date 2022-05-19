Feature: New layout in the edit modal
	User can see new fields: learning level, learning activity, what you will need, duration, completion, for beginners, accessibility, and category

	Background: 
		Given I am signed into Studio
			And I am in an editable channel
			And I have added resources of type .pdf, .epub, .mp3, .mp4, .mov, .zip to the channel

	Scenario: View .PDF/.EPUB layout
		When I right click a .PDF or .EPUB resource
		Then I see an options menu for that .PDF or .EPUB
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a book icon and a label *Read*
			And I see the resource thumbnail
			And I see a *Preview files* option
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Completion* and a *Duration* drop-downs and a *Minutes* slider
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox 
			And I see the *Accessibility* section
			And I see the following checkboxes there: *Has alternative text description for images*, *Has high contrast display for low vision*, *Tagged PDF*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*

	Scenario: View .MP3 layout
		When I right click an .MP3 resource
		Then I see an options menu for that .MP3
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a headphones icon and a label *Listen*
			And I see an audio player
			And I see a *Preview files* option
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Duration* drop-down
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
			And I see a play icon and a label *Watch*
			And I see an audio player
			And I see a *Preview files* option
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Duration* drop-down
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox 
			And I see the *Accessibility* section with the following checkboxes: *Has sign language captions*, *Has audio descriptions*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*

	Scenario: View *Practice* resource layout
		When I right click a *Practice* resource
		Then I see an options menu for that *Practice* resource
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a writing sheet icon and a label *Practice*
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category*
			And I see the *Assessment options* section
			And I see a *Randomize question order for learners*
			And I see the *Completion* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see the following fields: *Completion*, *Goal*, *Correct answers needed*, *Recent answers*, *Duration* and a *Minutes* slider
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox 
			And I see the *Accessibility* section with the following checkbox: *Has alternative text description for images*
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
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Duration* drop-down and a *Minutes* slider
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox 
			And I see the *Accessibility* section with the following checkboxes: *Has alternative text descriptions*, *Has high contrast display for low vision*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*

	Scenario: View multiple activities layout
		When I right click a resource #TO DO: How exactly do we get to the multiple activities edit details?
		Then I see an options menu for that resource
		When I click *Edit details*
		Then I see the *Edit details* modal
			And I am at the *Details* tab
			And I see a the icons for the activities
			And I see a thumbnail
			And I see a *Preview files* option
			And I see the *Basic information* section with the following fields: *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category*
			And I see a *Completion* section under the *Basic information* section
			And I see the *Allow learner to mark as complete* checkbox
			And I see a *Duration* drop-down and a *Minutes* slider
			And I see the *Thumbnail* section
			And I see the *Audience* section
			And I see the *Language* and *Visible to* drop-downs
			And I see a *For beginners* checkbox 
			And I see the *Accessibility* section with the following checkboxes: *Has alternative text descriptions*, *Has high contrast display for low vision*, *Tagged PDF*
			And I see the *Source* section
			And I see the following fields there: *Author*, *Provider*, *Aggregator*, *License*, *Copyright holder*
