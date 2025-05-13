Feature: View channels with view-only access

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And I have view-only permissions for the channel

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
