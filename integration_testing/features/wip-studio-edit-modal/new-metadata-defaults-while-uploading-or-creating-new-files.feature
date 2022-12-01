Feature: New metadata defaults while uploading or creating new files
	User uploads files and sees which new metadata fields are and aren't set by default

	Background: 
		Given I am signed into Studio
			And I am in an editable channel
		When I click the *Add* button
			And I select *Upload files*
		Then I see the *Upload files* page

	Scenario: Upload .PDF or .EPUB
		When I upload a .PDF or an .EPUB file
		Then I see the edit modal for <.PDF or .EPUB>
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Read*
			And *Level* is empty
			And *Requirements* is empty
			And *Tags* is empty
			And *Category* is empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *Viewed in its entirety*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is not checked
			And all *Accessibility* checkboxes are unchecked

	Scenario: Upload .MP3
		When I upload <.MP3>
		Then I see the edit modal for <.MP3>
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Listen*
			And *Level* is empty
			And *Requirements* is empty
			And *Tags* is empty
			And *Category* is empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When time spent is equal to duration*
			And *Duration* is set to *Time to complete*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked

	Scenario: Upload .MP4 or .WEBM
		When I upload <.MP4 or .WEBM>
		Then I see the edit modal for <.MP4 or .WEBM>
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is set to *Watch*
			And *Level* is empty
			And *Requirements* is empty
			And *Tags* is empty
			And *Category* is empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When time spent is equal to duration*
			And *Duration* is set to *Time to complete*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked

	Scenario: Upload .ZIP
		When I upload <.ZIP>
		Then I see the edit modal for <.ZIP>
			And the *Title* field is prefilled with the name of the file
			And the *Description* field is empty
			And *Learning activity* is empty
			And *Level* is empty
			And *Requirements* is empty
			And *Tags* is empty
			And *Category* is empty
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When time spent is equal to duration*
			And *Duration* is set to *Time to complete*
			And *Minutes* is set to *10*
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked

	Scenario: Create new Practice resource
		Given I am in an editable channel
		When I click *Add*
			And I click *New exercise*
		Then I see the edit modal for the exercise
			And the *Title* field is empty
			And the *Description* field is empty
			And *Learning activity* is is set to *Practice*
			And *Level* is empty
			And *Requirements* is empty
			And *Tags* is empty
			And *Category* is empty
			And *Randomize question order for learners* is checked
			And *Allow learners to mark as complete* is unchecked
			And *Completion* is set to *When goal is met*
			And *Goal* is empty
			And there is no thumbnail
			And *Language* is empty
			And *Visible to* is set to *Anyone*
			And *For beginners* is unchecked
			And all *Accessibility* checkboxes are unchecked
			