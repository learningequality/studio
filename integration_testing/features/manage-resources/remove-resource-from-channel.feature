Feature: Remove a folder or a resource from a channel

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And I have edit permissions for the channel>

	Scenario: Remove a folder through the *···* (Options) menu
		When I hover over a folder
			And I click on the *···* (Options) button
			And I select the *Remove* option
		Then I can see the *Sent to trash* snackbar notification
			And I see the *Undo* button
			And I no longer see the folder

	Scenario: Undo the removal of a folder
		Given I've just removed a folder
			And I see the *Sent to trash* snackbar notification
			And I see the *Undo* button
		When I click the *Undo* button
		Then I can see the folder again

	Scenario: Remove a resource through the *···* (Options) menu
		When I hover over a resource
			And I click on the *···* (Options) button
			And I select the *Remove* option
		Then I can see the *Sent to trash* snackbar notification
			And I see the *Undo* button
			And I no longer see the resource

	Scenario: Undo the removal of a resource
		Given I've just removed a resource
			And I see the *Sent to trash* snackbar notification
			And I see the *Undo* button
		When I click the *Undo* button
		Then I can see the resource again

	Scenario: Remove a folder through the toolbar
		When I select a folder's checkbox
		Then I see the toolbar options for the folder
		When I click the *Remove* button
		Then I can see the *Sent to trash* snackbar notification
			And I see the *Undo* button
			And I no longer see the folder

	Scenario: Remove a resource through the toolbar
		When I select a resource's checkbox
		Then I see the toolbar options for the resource
		When I click the *Remove* button
		Then I can see the *Sent to trash* snackbar notification
			And I see the *Undo* button
			And I no longer see the resource

	Scenario: Remove multiple folders or resources
	# same as for single folder and resources, just the snackbar notification indicates the number of items to remove
