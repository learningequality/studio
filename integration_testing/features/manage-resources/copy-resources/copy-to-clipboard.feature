Feature: Copy to clipboard

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page
			And I have edit permissions for the channel

	Scenario: Copy a folder to the clipboard from *···* (Options)
		When I hover over a folder
			And I click on the *···* (Options) button
			And I select the *Copy to clipboard* option
		Then I see the *Copied to clipboard* snackbar message
		When I click the clipboard icon in the lower right corner
		Then I can see the copied folder in the clipboard

	Scenario: Copy a resource to the clipboard from *···* (Options)
		When I hover over a resource
			And I click on the *···* (Options) button
			And I select the *Copy to clipboard* option
		Then I see the *Copied to clipboard* snackbar message
		When I click the clipboard icon in the lower right corner
		Then I can see the copied resource in the clipboard

	Scenario: Copy a folder to the clipboard from the toolbar
		When I check a folder's checkbox
		Then I see the toolbar options for the folder
		When I click the *Copy to clipboard* toolbar button
		Then I see the *Copied to clipboard* snackbar message
		When I click the clipboard icon in the lower right corner
		Then I can see the copied folder in the clipboard

	Scenario: Copy a resource to the clipboard from the toolbar
		When I check a resource's checkbox
		Then I see the toolbar options for the resource
		When I click the *Copy to clipboard* toolbar button
		Then I see the *Copied to clipboard* snackbar message
		When I click the clipboard icon in the lower right corner
		Then I can see the copied folder in the clipboard

	Scenario: Copy multiple resources within the clipboard
		When I click the clipboard button at the bottom-right of the screen
		Then the clipboard opens ups
		When I select multiple items via checkboxes
			And I see that the select bar has changed to an actions bar
			And I click the *Make a copy* button in the actions bar
		Then I see a *Copied in clipboard* snackbar message
		When the copy creation process has finished
		Then I see that the copies are created in my clipboard
