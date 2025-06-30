Feature: Edit *Accessibility* options for all file types

	Background:
		Given I am signed-in to Studio
			And I am in an editable channel
		When I right click a resource
			And I click *Edit details*
		Then I see the edit modal for the resource
			And I see the *Accessibility* section under the *Audience* section

	Scenario: View options for .MP4
		Given I am viewing an .MP4 in the edit modal
		Then I see a checkbox that says *Includes captions or subtitles*
			And I see a checkbox that says *Includes audio descriptions*
			And I see a checkbox that says *Includes sign language captions*

	Scenario: View tooltips for .MP4
		Given I am viewing an .MP4 in the edit modal
		When I hover my mouse over the info icon for *Includes sign language captions*
		Then I see *Synchronized sign language interpretation is available for audio and video content*
		When I hover my mouse over the info icon for *Includes audio descriptions*
		Then I see *The resource contains a second narration audio track that provides additional information for the benefit of blind users and those with low vision*

	Scenario: View options for .PDF or .EPUB
		Given I am viewing a .PDF or .EPUB in the edit modal
		Then I see a checkbox that says *Includes alternative text description for images*
			And I see a checkbox that says *Includes high contrast text for learners with low vision*
			And I see a checkbox that says *Tagged PDF*

	Scenario: View tooltips for .PDF or .EPUB
		Given I am viewing a .PDF or .EPUB in the edit modal
		When I hover my mouse over the info icon for *Includes alternative text descriptions for images*
		Then I see *Visual elements in the resource have descriptions that can be accessed by screen readers for the benefit of blind learners*
		When I hover my mouse over the info icon for *Includes high contrast text for learners with low vision*
		Then I see *The resource text and visual elements are displayed with high contrast for the benefit of users with low vision*
		When I hover my mouse over the info icon for *Tagged PDF*
		Then I see *The document contains PDF tags that can be accessed by screen readers for the benefits of blind learners*

	Scenario: View options for .MP3
		Given I am viewing a .MP3 in the edit modal
		Then I see a *Captions and subtitles* section underneath the *Source* section

	Scenario: View tooltips for .MP3
		Given I am viewing an .MP3 in the edit modal
		When I hover my mouse over the info icon for *Captions and subtitles*
		Then I see *Supported formats: vtt*

	Scenario: View options for .ZIP
		Given I am viewing a .ZIP in the edit modal
		Then I see a checkbox that says *Includes alternative text description for images*
			And I see a checkbox that says *Includes high contrast text for learners with low vision*

	Scenario: View tooltips for .ZIP
		Given I am viewing a .ZIP in the edit modal
		When I hover my mouse over the info icon for *Includes alternative text description for images*
		Then I see *Visual elements in the resource have descriptions that can be accessed by screen readers for the benefit of blind learners*
		When I hover my mouse over the info icon for *Includes high contrast display for low vision*
		Then I see *The resource text and visual elements are displayed with high contrast for the benefit of users with low vision*

	Scenario: View options for Exercises
		Given I am viewing an Exercise in the edit modal
		Then I see a checkbox that says *Includes alternative text description for images*

	Scenario: View tooltips for Practice resources
		Given I am viewing an Exercise in the edit modal
		When I hover my mouse over the info icon for *Includes alternative text description for images*
		Then I see *Visual elements in the resource have descriptions that can be accessed by screen readers for the benefit of blind learners*

	Scenario: Select and deselect accessibility options
		Given that for any resource there are some checkbox options in the *Accessibility* section
		When I select a checkbox for an option under *Accessibility*
		Then I see that the checkbox is selected
		When I uncheck a selected option
		Then I see the checkbox is empty

	Scenario: See that accessibility field is optional
		Given the *Accessibility* field of a resource is empty
		When I click *Finish*
		Then I see the resource in the topic tree
			And I do not see an error icon
		When I left-click on the resource
		Then I see the previewer for the resource
			And I see that the *Accessibility* field is empty
