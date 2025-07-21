Feature: Manage the clipboard

	Background:
		Given I am signed in to Studio
			And I am at the channel editor for an editable channel
			And there are folders and resources copied to the clipboard

	Scenario: Preview a resource in the clipboard
		When I click on clipboard button on the bottom-right of the screen
		Then the clipboard opens up
		When I click on a folder title or resource title
		Then I see the clipboard content transition to the preview panel

	Scenario: Expand and collapse folders in the clipboard
		Given I am viewing the clipboard
		When I expand a folder on the clipboard via the downward arrow button
		Then I see the items within the folder appear
			And I see the downward arrow button changes to an upward arrow button
		When I collapse a folder on the clipboard via the upward arrow button
		Then I see the items within that folder disappear
			And I see the upward arrow button changes to an upward arrow button

	Scenario: Go to the resource's original location
		Given I am viewing the clipboard
		When I right click a folder or resource
			And I click *Go to original location*
		Then a new tab opens
			And I see the resource in it's original location

	Scenario: Move an item in the clipboard via right click
		Given I am viewing the clipboard
		When I right click a folder or a resource
			And click the *Move to...* option from the menu
		Then I see the *Move N folder(s), N resources into: <channel>* modal
			And I can choose a new directory or channel to move the items to

	Scenario: Move multiple resources
		Given I am viewing the clipboard
		When I select multiple items
		Then I see that the select bar changes to an actions bar
		When I click the *Move* button in the actions bar
		Then I see the *Move N folder(s), N resources into: <channel>* modal
			And I can choose a new directory or channel to move the items to

	Scenario: Delete a resource from the clipboard via right click
		Given I am viewing the clipboard
		When I right click a folder or a resource
			And I click *Delete* from the menu that appears
		Then I see that the resource is removed from the clipboard
			And I see a *Deleted from clipboard* snackbar message

	Scenario: Delete multiple resources from the clipboard
		Given I am viewing the clipboard
		When I select multiple resources
			And I click the *Delete* button in the actions bar
		Then I see that all of the selected resources are removed from the clipboard
			And I see a *Deleted from clipboard* snackbar message
