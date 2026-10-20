Feature: View organization storage

	Background:
		Given I am signed in to Studio
			And I am an active member of an organization that has channels
			And I am at the *My organizations* page

		Scenario: View the size of each organization channel and the total size
			When I click the desired organization
				And I click the *Channels* tab
			Then I see a table with the name, description and size of each of the organization's channels
				And I see the total size of the listed channels below the table

		Scenario: Open an organization channel from the channels table
			Given I am at the *Channels* tab of the organization
			When I click the name of a channel
			Then I see the channel open in a new browser tab

		Scenario: Organization without channels
			Given I am an active member of an organization that has no channels
			When I open the *Channels* tab of the organization
			Then I see the message *This organization has no channels yet.*

		Scenario: Organization channels do not count towards my storage
			Given I am an editor of a channel that is not part of an organization
				And I am at *Settings > Storage*
				And I see how much storage I am using
			When the channel becomes part of an organization
				And I reload *Settings > Storage*
			Then I see that the storage I am using no longer includes the channel's files
