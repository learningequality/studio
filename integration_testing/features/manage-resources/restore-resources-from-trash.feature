Feature: Restore resources from trash

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And I have already removed some resources
			And I have opened the trash page

	Scenario: Restore a single resource from trash to a channel
		When I select a resource
			And I click the *Restore* button
		Then I see the *Move N folders, N resources into: <channel>* modal
		When I select the restore destination
			And I click the *Move here* button
		Then I see the *Moved to <destination>* snackbar notification
			And I see a *Go to location* button
		When I click the *Go to location* button
		Then I see that the resource is restored in the selected destination

	Scenario: Restore multiple resources from trash to a channel
		When I select multiple resources
			And I click the *Restore* button
		Then I see the *Move N folders, N resources into: <channel>* modal
		When I select the restore destination
			And I click the *Move here* button
		Then I see the *Moved to <destination>* snackbar notification
			And I see a *Go to location* button
		When I click the *Go to location* button
		Then I see that the resources are restored in the selected destination
