Feature: New metadata defaults while uploading or creating new files
User uploads files and sees which new metadata fields are and aren't set by default

# Comment here

	Background: 
		Given I am signed into Studio
			And I am in an editable channel
		When I click the *ADD* button
		When I select *Upload files*
		Then I see the *Upload files* page

	Scenario: Upload .PDF or .EPUB
		When I upload <.PDF or .EPUB>
		Then I see the edit modal for <.PDF or .EPUB>
			And I see upload of <.PDF or .EPUB> is in progress
			And I see *Level* is empty
			And I see *Learning activity* is set to *Read*
			And I see *What you will need* is empty
			And I see *Allow marking as complete* is empty
			And I see *Completion* is set to *All content viewed*
			And I see *Accessibility* checkboxes are unchecked
			And I see *Category* is empty

	Scenario: Upload .MP3
		When I upload <.MP3>
		Then I see the edit modal for <.MP3>
			And I see upload of <.MP3> is in progress
			And I see *Level* is empty
			And I see *Learning activity* is set to *Listen*
			And I see *What you will need* is empty
			And I see *Allow marking as complete* is empty
			And I see *Completion* is set to *Exact time to complete*
			And I see *Exact time to complete* is set to the exact duration of <.MP3>
			And I see *Accessibility* checkboxes are unchecked
			And I see *Category* is empty

	Scenario: Upload .MP4 or .MOV
		When I upload <.MP4 or .MOV>
		Then I see the edit modal for <.MP4 or .MOV>
			And I see upload of <.MP4 or .MOV> is in progress
			And I see *Level* is empty
			And I see *Learning activity* is set to *Watch*
			And I see *What you will need* is empty
			And I see *Allow marking as complete* is empty
			And I see *Completion* is set to *Exact time to complete*
			And I see *Exact time to complete* is set to the exact duration of <.MP4 or .MOV>
			And I see *Accessibility* checkboxes are unchecked
			And I see *Category* is empty

	Scenario: Upload .ZIP
		When I upload <.ZIP>
		Then I see the edit modal for <.ZIP>
			And I see upload of <.ZIP> is in progress
			And I see *Level* is empty
			And I see *Learning activity* is empty
			And I see *What you will need* is empty
			And I see *Allow marking as complete* is empty
			And I see *Completion* is empty
			And I see *Accessibility* checkboxes are unchecked
			And I see *Category* is empty

	Scenario: Create new Practice resource
		Given I am in an editable channel
		When I click *ADD*
		When I click *New exercise*
		Then I see the edit modal for the exercise
			And I see *Level* is empty
			And I see *Learning activity* is set to *Practice*
			And I see *What you will need* is empty
			And I see *Allow marking as complete* is empty
			And I see *Completion* is empty
			And I see *Accessibility* checkboxes are unchecked
			And I see *Category* is empty


Examples:
| ???      | ??? | 
| ?????!?! |
