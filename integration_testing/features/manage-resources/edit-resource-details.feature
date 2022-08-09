Feature: Edit resource details 

	Background: 
		Given I am signed in to Studio
			And I am on the channel editor page

		Scenario: Edit details
			When I click the *⋮* (Options) button for a resource
				And I click the *Edit details* option
			Then I see the *Edit details* window
				And I can edit different properties of the resource such as - *Basic information*, *Thumbnail*, *Audience*, *Source* etc.
			When I modify any of the details
			Then I see a message: *Changes saved*
			When I click the *Finish* button
			Then I am returned at the main topic tree view
			