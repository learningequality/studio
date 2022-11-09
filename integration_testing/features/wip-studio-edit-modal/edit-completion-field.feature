Feature: Edit completion/duration field
	Across all file types

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I right click a <resource>
			And I click *Edit details*
		Then I see the *Edit details* modal for the <resource>
			And I see the *Completion* section underneath the *Basic information* section

	Scenario: Default options for .MP4 or .MP3 on file upload
		Given I am viewing an .MP4 or an .MP3 file that I have just added
			And I see the *Completion* section
		Then I see the *Completion* is set by default to *When time spent is equal to duration*
			And *Duration* is set by default to *Time to complete*
		Then I see the exact duration <XX:XX> appear next to the *Duration* field as plain text
			And I see that I cannot edit it

	Scenario: View options for .MP4 or .MP3
		Given I am viewing an .MP4 or an .MP3 file
		When I click the *Completion* dropdown
		Then I see the options: *When time spent is equal to duration* and *Reference material*
		When I click the *Duration* dropdown
		Then I see the options: *Time to complete*, *Short activity*, and *Long activity*


	Scenario: Default options for .PDF, .EPUB or slides
		Given I am viewing a .PDF, .EPUB or slidesfile that I have just added
			And I see the *Completion* section
		Then I see the *Completion* is set by default to *Viewed in its entirety*
			And *Duration* is hidden by default

	Scenario: View options for .PDF, .EPUB or slides
		Given I am viewing .PDF, .EPUB or slides
		When I click the *Completion* dropdown
		Then I see the options: *Viewed in its entirety*, *When time spent is equal to duration*, and *Reference material*


	Scenario: Default options for .ZIP on file upload
		Given I am viewing a .ZIP file that I have just added
			And I see the *Completion* section
		Then I see the *Completion* is set by default to *When time spent is equal to duration*
			And *Duration* is set by default to *Short Activity* with a value of *5 minutes*

	Scenario: View options for .ZIP
		Given I am viewing a .ZIP
		When I click on the *Completion* dropdown
		Then I see the options: *When time spent is equal to duration*,  *Determined by the resource*, and *Reference material*

	Scenario: Default options for Exercise on content creation
		Given I am viewing an exercise  that I have just added
			And I see the *Completion* section
		Then I see the *Completion* is set by default to *When goal is met*
			And there is a *goal* dropdown with no default set
			And *Duration* is not visible for exercises

	Scenario: View options for Practice resources
		Given I am viewing an exercise
		When I click on the *Completion* dropdown
		Then I see the options: *When goal is met* and *Practice quiz*

	Scenario: Set completion to *Short activity*
		When I click on the *Completion* dropdown
			And I select *Short activity*
		Then I see *Short activity* appear in the text input
			And I see a *Minutes* dropdown input field appear next to *Completion*
			And I see *Minutes* is set to 10 by default
			And I see the maximum option in the menu is 30 minutes
			And I see the caption *(Optional) Duration until resource is marked as complete. This value will not be shown to learners*

	Scenario: Adjust time for short activities
		Given *Completion* is set to *Short activity*
		When I adjust the value by selecting a different option in the dropdown
		Then I see the value in the *Minutes* field update

	Scenario: Set completion to *Long activity*
		When I click on the *Completion* dropdown
			And I select *Long activity*
		Then I see *Long activity* appear in the text input
		And I see a *Minutes* dropdown input field appear next to *Completion*
		And I see *Minutes* is set to 50 by default
		And I see the maximum option in the menu is 120 minutes
		And I see the maximum option in the menu is 40 minutes
		And I see the caption *(Optional) Duration until resource is marked as complete. This value will not be shown to learners*

	Scenario: Adjust time for long activities
		Given *Completion* is set to *Long activity*
		When I adjust the value by selecting a different option in the dropdown
		Then I see the value in the *Minutes* field update

	Scenario: Set completion to *Reference material*
		When I click on the *Completion* dropdown
			And I select *Reference material*
		Then I see *Reference material* appear as an input for *Completion*
			And I see the caption *Progress will not be tracked on reference material unless learners mark it as complete*
			And the *Duration* input field is hidden

	Scenario: Set completion to *Time to complete* on .MP4 or .MOV
		Given I am viewing an .MP4 or .MOV
		When I click the *Completion* dropdown
		When I select *Time to complete*
		Then I see the exact duration <XX:XX> appear next to the *Duration* field as plain text
			And I see that I cannot edit it

	Scenario: Set completion to *Time to complete* for .PDF, .EPUB, or slides
		Given I am viewing a resource that is a .PDF, .EPUB, or slides
			And *Completion* is set to *When time spent is equal to duration*
		When I click the *Duration* dropdown
			And I select *Time to complete*
		Then I see a *Time to complete* appear as an input for *Duration*
			And I see a *Minutes* text input field appear next to *Duration*
		When I click the *Minutes* field
			And I enter a whole number
			And I lose focus on the field
		Then I see the number has saved

	Scenario: Enter whole numbers only to *Minutes* field
		Given I can see the *Minutes* field in *Completion*
		When I try to enter a non-numeric input or non-whole number
		Then I see that I am blocked from entering that input

	Scenario: Check *Allow learners to mark as complete*
		Given I can see the *Allow learners to mark as complete* field in *Completion*
		When I click on the checkbox
		Then I see that it changes from its current state to the opposite

	Scenario: Set completion to *Practice until goal is met*
		Given I am viewing an exercise
		When I click the *Completion* dropdown
			And I click *When goal is met*
		Then I see the *Completion* field is set to *When goal is met*
			And I see an empty *Goal* text field dropdown appears next to it
		When I click the *Goal* dropdown
		Then I see the options: *100% correct*, *M of N*, *10 in a row*, *2 in a row*, *3 in a row*, *5 in a row*
		When I select *M of N*
		Then I see an empty *Correct answers needed* text field, */*, and empty *Recent answers* text field appear

	Scenario: See that *Completion* field is required
		Given that a required *Completion* or *Duration* field of <resource> is empty
		When I click the *Completion* or *Duration* text field
			And I lose focus on the *Completion* or *Duration* text field
		Then I see *Completion* or *Duration* is in an error state
			And I see *This field is required*
		When I click *FINISH*
		Then I see a pop up that informs me that the resource is incomplete
			And I can *Exit anyway* or *Keep editing*
		When I click *EXIT* without adding the required fields
		Then I see <resource> in the topic tree
			And I see a red error icon on <resource>
		When I left-click the <resource>
		Then I see the previewer for the <resource>
			And I see the missing *Completion* or *Duration* field has a red outline error
		And I see *This field is required* below the field
