Feature: Restore resources from trash

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editing page

	Scenario: Restore a single resource from trash to a channel
		When I click the *Trash* button
		Then I see the *Managing deleted content* modal
			And I see all the deleted resources in the modal
		When I select the <resource> resource
		Then I see the *Restore Selected* button is active
		When I click the *Restore Selected* button
		Then I see the *Moving Content* modal
		When I select the <channel> channel as a restore destination
			And I click the *Move* button
		Then I see the *Moving 1 resource to <channel>* notification
		When I click the arrow button to open the <channel> topic tree
			And I select the <topic> topic
		Then I see the *Moving 1 resource to <topic>* notification
		When I click *Move* button again
		Then I see the *Managing deleted content* modal again
		When I click the *Close* button
			And I open the <topic> topic
			And I reload the page 
			#not sure if this is a bug or a feature, but I had to do it
		Then I see the <resource> resource restored to the <topic> inside the <channel>

	Scenario: Restore multiple resources from trash to a channel
		When I click the *Trash* button
		Then I see the *Managing deleted content* modal
			And I see all the deleted resources in the modal
		When I select the <resource> resource
		Then I see the *Restore Selected* button is active
		When I click the *Restore Selected* button
		Then I see the *Moving Content* modal
		When I select the <channel> channel as a restore destination
			And I click the *Move* button
		Then I see the *Moving <number> resources to <channel>* notification
		When I click the arrow button to open the <channel> topic tree
			And I select the <topic> topic
		Then I see the *Moving resources to <topic>* notification
		When I click *Move* button again
		Then I see the *Managing deleted content* modal again
		When I click the *Close* button
			And I open the <topic> topic
			And I reload the page 
			#not sure if this is a bug or a feature, but I had to do it
		Then I see the <resource> resource restored to the <topic> inside the <channel>

	Examples:
	| channel | resource | number | topic |