Feature: Edit *Accessibility* field
	Across all file types

# Comment here

	Background: 
		Given I am signed into Studio
			And I am in an editable channel
		When I right click <resource>
		When I click *Edit details*
		Then I see the edit modal for <resource>
			And I see the *Accessibility* section underneath the *Audience* section

	Scenario: View options for .MP4
		Given I am viewing an .MP4 in the edit modal
		Then I see a checkbox that says *Has sign language captions*
			And I see a checkbox that says *Has audio descriptions*

	Scenario: View tooltips for .MP4
		Given I am viewing an .MP4 in the edit modal
		When I hover my mouse over the info icon for *Has sign language captions*
		Then I see *text*
		When I hover my mouse over the info icon for *Has audio descriptions*
		Then I see *text*

	Scenario: View options for .PDF or .EPUB
		Given I am viewing a .PDF or .EPUB in the edit modal
		Then I see a checkbox that says *Has alternative text description for images*
			And I see a checkbox that says *Has high contrast display for low vision*
			And I see a checkbox that says *Tagged PDF*

	Scenario: View tooltips for .PDF or .EPUB
		Given I am viewing a .PDF or .EPUB in the edit modal
		When I hover my mouse over the info icon for *Has alternative text description for images*
		Then I see *text*
		When I hover my mouse over the info icon for *Has high contrast display for low vision*
		Then I see *text*
		When I hover my mouse over the info icon for *Tagged PDF*
		Then I see *text*

	Scenario: View options for .MP3
		Given I am viewing a .MP3 in the edit modal
		Then I see a *Captions and subtitles* section underneath the *Source* section

	Scenario: View tooltips for .MP3
		Given I am viewing an .MP3 in the edit modal
		When I hover my mouse over the info icon for *Captions and subtitles*
		Then I see *Supported formats: vtt*

	Scenario: View options for .ZIP
		Given I am viewing a .ZIP in the edit modal
		Then I see a checkbox that says *Has alternative text description for images*
			And I see a checkbox that says *Has high contrast display for low vision*

	Scenario: View tooltips for .ZIP
		Given I am viewing a .ZIP in the edit modal
		When I hover my mouse over the info icon for *Has alternative text description for images*
		Then I see *text*
		When I hover my mouse over the info icon for *Has high contrast display for low vision*
		Then I see *text*

	Scenario: View options for Exercises
		Given I am viewing an Exercise in the edit modal
		Then I see a checkbox that says *Has alternative text description for images*

	Scenario: View tooltips for Practice resources
		Given I am viewing an Exercise in the edit modal
		When I over my mouse over the info icon for *Has alternative text description for images*
		Then I see *text*

	Scenario: Select and deselect accessibility options
		Given that <resource> has checkboxes in the *Accessibility* section
		When I click <option> under *Accessibility*
		Then I see the checkbox is selected
		When I click <option> while it is selected
		Then I see the checkbox is empty

	Scenario: See that accessibility field is optional
		Given the *Accessibility* field of <resource> is empty
		When I click *FINISH*
		Then I see <resource> in the topic tree
			And I do not see an error icon
		When I left-click <resource>
		Then I see the previewer for <resource>
			And I see the *Accessibility* field is empty

Examples:
| ???      | ??? | 
| ?????!?! |
