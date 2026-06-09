Feature: View channels with view-only access

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page with view-only permissions for the channel

	Scenario: View a channel with view-only access
		When I look at the channel editor page
		Then I see the title of the channel to the left
			And I see a disabled *View-only* button
			And I see a *Share* drop-down to the left of it
			And I see a grayed out info text when the channel was last published
			And I see a blue *Add* button
			And I see the channel topic tree and contents

	Scenario: Navigate by using the topic tree sidebar
		When I click on a folder with subfolders and resources
		Then I see its subfolders and resources
		When I click the *>* button for the folder when collapsed
		Then it gets expanded so that I can see the subfolders
		When I click the *Collapse all* button
		Then I see that all folders with subfolders collapse
		When I click on a folder with no resources
		Then I see *Nothing in this folder yet*
		When I hover over a folder
			And I click on the *···* button for more options
		Then I can see the *View details* and *Copy to clipboard* options
		When I click the *View details* option
		Then I can see the *folder* panel open on the right
			And I can see all the details for the folder
		When I click the *Copy to clipboard* option
		Then I see a *Copied to clipboard* snackbar message

	Scenario: View details for a resource
		When I hover over a resource
			And I click on a *···* button for more options
			And I select the *View details* option
		Then I can see the details panel open on the right
			And I can see all the details for the resource

	Scenario: Copy a resource to the clipboard from *···* options
		When I hover over a resource
			And I click on a *···* button for more options
			And I click the *Copy to clipboard* option
		Then I see a *Copied to clipboard* snackbar message
