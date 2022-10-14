Feature: Edit completion/duration field
	Across all file types

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I right click a <resource>
			And I click *Edit details*
		Then I see the *Edit details* modal for the <resource>
			And I see the *Completion* section underneath the *Basic information* section

	Scenario: View options for .MP4 or .MP3
		Given I am viewing an .MP4 or an .MP3 file
		When I click the *Completion* dropdown
		Then I see the options: *Complete duration* and *Reference*
		When I click the *Duration* dropdown
		Then I see the options: *Exact time to complete*, *Short activity*, and *Long activity*

	Scenario: View options for .PDF, .EPUB or slides
		Given I am viewing .PDF, .EPUB or slides
		When I click the *Completion* dropdown
		Then I see the options: *All content viewed*, *Complete duration*, and *Reference*

	Scenario: View options for .ZIP
		Given I am viewing a .ZIP
		When I click on the *Completion* dropdown
		Then I see the options: *Complete duration*, *Determined by this resource*, and *Reference*

	Scenario: View options for Practice resources
		Given I am viewing an exercise
		When I click on the *Completion* dropdown
		Then I see the options: *Practice until goal is met* and *Practice quiz*

	Scenario: Set completion to *Short activity*
		When I click on the *Completion* dropdown
			And I select *Short activity*
		Then I see *Short activity* appear in the text input
			And I see a *Minutes* text input field appear next to *Completion*
			And I see a slider appear next to *Minutes*
			And I see *Minutes* is set to 10 by default
			And I see the maximum value of the slider is 30 minutes
			And I see the caption *(Optional) Duration until resource is marked as complete. This value will not be shown to learners*

	Scenario: Adjust time for short activities
		Given *Completion* is set to *Short activity*
		When I adjust the slider
		Then I see the value in the *Minutes* field change to match the slider
		When I type in a new value into *Minutes*
		When I lose focus on *Minutes*
		Then I see the slider changes to match the value in *Minutes*
		When I enter a value above 30 minutes into *Minutes*
		Then I see the value in *Minutes* is set to 30 minutes
			And I see the slider is set to 30 minutes

	Scenario: Set completion to *Long activity*
		When I click on the *Completion* dropdown
			And I select *Long activity*
		Then I see *Long activity* appear in the text input
			And I see a *Minutes* text input field appear next to *Completion*
			And I see a slider appear next to *Minutes*
			And I see *Minutes* is set to 45 by default
			And I see the maximum value of the slider is 120 minutes
			And I see the caption *(Optional) Duration until resource is marked as complete. This value will not be shown to learners*

	Scenario: Adjust time for long activities
		Given *Completion* is set to *Long activity*
		When I adjust the slider
		Then I see the value in the *Minutes* field change to match the slider
		When I type in a new value into *Minutes*
		When I lose focus on *Minutes*
		Then I see the slider changes to match the value in *Minutes*
		When I enter a value above 120 minutes into *Minutes*
		Then I see the value in *Minutes* is set to 120 minutes
			And I see the slider is set to 120 minutes
		When I enter a value below 45 minutes into *Minutes*
		Then I see the value in *Minutes* is set to 45 minutes
			And I see the slider is set to 45 minutes

	Scenario: Set completion to *Reference*
		When I click on the *Completion* dropdown
			And I select *Reference*
		Then I see *Reference* appear as an input for *Completion*
			And I see the caption *Progress will not be tracked on reference material unless learners mark it as complete*

	Scenario: Set completion to *Exact time to complete* on .MP4 or .MOV
		Given I am viewing an .MP4 or .MOV
		When I click the *Completion* dropdown
		When I select *Exact time to complete*
		Then I see the exact duration <XX:XX> appear next to the *Completion* field as plain text
			And I see that I cannot edit it

	Scenario: Set completion to *Exact time to complete* for non- .MP4 or .MOV
		Given I am viewing a resource that is not an .MP4 or .MOV
		When I click the *Completion* dropdown
			And I select *Exact time to complete*
		Then I see a *Exact time to complete* appear as an input for *Completion*
			And I see a *Minutes* text input field appear next to *Completion*
			And I see it is empty by default
		When I click the *Minutes* field
			And I enter a whole number
			And I lose focus on the field
		Then I see the number has saved

	Scenario: Enter whole numbers only to *Minutes* field
		Given I can see the *Minutes* field in *Completion*
		When I try to enter a non-numeric input or non-whole number
		Then I see that I am blocked from entering that input

	Scenario: Set completion to *Practice until goal is met*
		Given I am viewing an exercise
		When I click the *Completion* dropdown
			And I click *Practice until goal is met*
		Then I see the *Completion* field is set to *Practice until goal is met*
			And I see an empty *Goal* text field dropdown appears next to it
		When I click the *Goal* dropdown
		Then I see the options: *100% correct*, *M of N*, *10 in a row*, *2 in a row*, *3 in a row*, *5 in a row*
		When I select *M of N*
		Then I see an empty *Correct answers needed* text field, */*, and empty *Recent answers* text field appear

	Scenario: See that *Completion* field is required
		Given the *Completion* field of <resource> is empty
		When I click the *Completion* text field
			And I lose focus on the *Completion* text field
		Then I see *Completion* is in an error state
			And I see *Completion is required*
		When I click *FINISH*
		Then I see <resource> in the topic tree
			And I see a red error icon on <resource>
		When I left-click the <resource>
		Then I see the previewer for the <resource>
			And I see there is no learning activity label at the top left
			And I see the *Completion* field has a red error icon
			And I see the message *Missing completion criteria* in red text
