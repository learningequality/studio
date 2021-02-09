Feature: Copy a topic or a resource to clipboard

	Background: 
		Given That I am signed in to Studio
			And I am on the <channel> editor page
			And I have edit permissions for <channel>

	Scenario: Copy a topic to clipboard from *···* (more options)
		When I hover over a <topic> topic
			And I click on a *···* button for more options
		Then I can see the *Copy to clipboard* option
		When I select the *Copy to clipboard* option
		Then I can see the snackbar notification 
			And I see the *Undo* button
		When I click the *Undo* button
		Then I don't see the snackbar notification any more 
			And I don't see the topic in the clipboard

	Scenario: Copy a resource to clipboard from *···* (more options)
		When I hover over a <resource> resource
			And I click on a *···* button for more options
		Then I can see the *Copy to clipboard* option
		When I select the *Copy to clipboard* option
		Then I can see the snackbar notification 
			And I see the *Undo* button
		When I click the *Undo* button
		Then I don't see the snackbar notification any more 
			And I don't see the resource in the clipboard

	Scenario: Copy a topic to clipboard from toolbar
		When I check the <topic> topic checkbox
		Then I see the toolbar options for <topic> topic  
		When I click the *Copy selected items to clipboard* toolbar button
		Then I can see the snackbar notification 
			And I see the *Undo* button
		When I click the *Undo* button
		Then I don't see the snackbar notification any more 
			And I don't see the topic in the clipboard

	Scenario: Copy a resource to clipboard from toolbar
		When I check the <resource> resource checkbox
		Then I see the toolbar options for <resource> resource 
		When I click the *Copy selected items to clipboard* toolbar button
		Then I can see the snackbar notification 
			And I see the *Undo* button
		When I click the *Undo* buttons
		Then I don't see the snackbar notification any more
			And I don't see the resource in the clipboard

	Scenario: Copy multiple topics to clipboard from toolbar
	# same as for single resources, just the snackbar notification indicates the number of items to remove

	Examples:
	| channel | topic | resource |
