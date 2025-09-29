Feature: Delete resources permanently

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And I have removed at least one resource from my channel editor tree
			And I am at the *Trash* page

	Scenario: Delete a single resource permanently
		When I select a resource
			And I click the *Delete* button
		Then I see the *Permanently delete 0 folders, 1 resource?* modal
		When I click the *Delete permanently* button
		Then the selected resource is removed from the list
			And I see a *Permanently deleted* snackbar message

	Scenario: Delete multiple resources permanently
		When I select several resources (and/or folders)
			And I click the *Delete* button
		Then I see the *Permanently delete N folder(s), N resource(s)?* modal
		When I click the *Delete permanently* button
		Then the selected resources are removed from the list
			And I see a *Permanently deleted* snackbar message

	Scenario: Delete all resources permanently
		When I select all resources (and/or folders)
			And I click the *Delete* button
		Then I see the *Permanently delete N folder(s), N resource(s)?* modal
		When I click the *Delete permanently* button
		Then the selected resources are removed from the list
			And I see a *Permanently deleted* snackbar message
			And I see *Trash is empty Resources removed from this channel will appear here*
