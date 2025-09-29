Feature: Metadata defaults while uploading or creating new files
	User uploads files and sees which new metadata fields are and aren't set by default

	Background:
		Given I am signed-in to Studio
			And I am at the *Upload files* page for an editable channel

	Scenario: Upload file of type .PDF/.EPUB/.KPUB/.BLOOMPUB/.BLOOMD
		When I upload a .PDF/.EPUB/.KPUB/.BLOOMPUB/.BLOOMD file
		Then I see the edit modal for the uploaded .PDF/.EPUB/.KPUB/.BLOOMPUB/.BLOOMD
			And I am at the *Details* tab
			And I see a bookmark icon and a label *Document*
			And I see the resource thumbnail
			And I see the *Preview files* option
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Read*
			And *Level*, *Requirements*, *Tags*, and *Category* are empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *Viewed in its entirety*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is not checked
			And all *Accessibility* checkboxes are unchecked

	Scenario: Upload an .MP3 file
		When I upload an .MP3 file
		Then I see the edit modal for the uploaded .MP3 file
			And I see a music note icon and a label *Audio*
			And I see an audio player
			And I see a *Preview files* option
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Listen*
			And *Level*, *Requirements*, *Tags*, and *Category* are empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When time spent is equal to duration*
			And *Duration* is set to *Time to complete*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked

	Scenario: Upload an .MP4 or .WEBM
		When I upload an .MP4 or a .WEBM file
		Then I see the edit modal for .MP4 or .WEBM
			And I see a video player icon and a label *Video*
			And I see a video player
			And I see a *Preview files* option
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Listen*
			And *Level*, *Requirements*, *Tags*, and *Category* are empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When time spent is equal to duration*
			And *Duration* is set to *Time to complete*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked
			And I see the *Captions and subtitles* section with an option to add captions

	Scenario: Upload .ZIP
		When I upload a .ZIP file
		Then I see the edit modal for .ZIP files
			And I see an icon and a label *HTML5 App*
			And I see an HTML player
			And I see a *Preview files* option
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Listen*
			And *Level*, *Requirements*, *Tags*, and *Category* are empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When time spent is equal to duration*
			And *Duration* is set to *Short activity*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked
			And I see the *Captions and subtitles* section with an option to add captions

	Scenario: Create a new exercise
		Given I am in an editable channel
		When I click the *Add* button
			And I select *New exercise*
		Then I see the *New exercise* modal for the exercise
			And the *Title* and *Description* fields are empty
			And *Learning activity* is is set to *Practice*
			And *Level*, *Requirements*, *Tags* and *Category* are empty
			And *Randomize question order for learners* is checked
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When goal is met*
			And *Goal* is empty
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked
