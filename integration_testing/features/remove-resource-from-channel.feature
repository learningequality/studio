Feature: Remove a topic or a resource from a channel

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editor page
			And I have edit permissions for <channel>

	Scenario: Remove a topic from *···* (more options)
		When I hover over a <topic> topic
			And I click on a *···* button for more options
		Then I can see the *Remove* option
		When I select the *Remove* option
		Then I can see the *Sent to trash* snackbar notification 
			And I see the *Undo* button
			And I don't see the <topic> topic anymore
		When I click the *Undo* button
		Then I can see the <topic> topic again 

	Scenario: Remove a resource from *···* (more options)
		When I hover over a <resource> resource
			And I click on a *···* button for more options
		Then I can see the *Remove* option
		When I select the *Remove* option
		Then I can see the *Sent to trash* snackbar notification 
			And I see the *Undo* button
			And I don't see the <resource> resource anymore
		When I click the *Undo* button
		Then I can see the <resource> resource again 

	Scenario: Remove a topic from toolbar
		When I check the <topic> topic checkbox
		Then I see the toolbar options for <topic> topic  
		When I click the *Delete selected items* button
		Then I can see the *Sent to trash* snackbar notification 
			And I see the *Undo* button
			And I don't see the <topic> topic anymore
		When I click the *Undo* button
		Then I can see the <topic> topic again 

	Scenario: Remove a resource from toolbar
		When I hover over a <resource> resource checkbox
		Then I see the toolbar options for <resource> resource 
		When I click the *Delete selected items* button
		Then I can see the *Sent to trash* snackbar notification 
			And I see the *Undo* button
			And I don't see the <resource> resource anymore
		When I click the *Undo* button
		Then I can see the <resource> resource again

	Scenario: Remove multiple topics or resources
	# same as for single resources, just the snackbar notification indicates the number of items to remove

	Examples:
	| channel | topic | resource |