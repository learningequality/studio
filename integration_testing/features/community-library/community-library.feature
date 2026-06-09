Feature: Community Library

	Background:
		Given I am signed in to Studio
			And I am at the *Community Library* page

	Scenario: Community Library page overview (no published channels)
		Given no channels have been published to the Community Library yet
		When I look at the page
		Then I see the *Community Library* title
			And I see *Browse community-submitted channels approved for discovery in Studio. Copy a token to use a channel in Kolibri. What is the Community Library?*
			And I see a *Help grow the Community Library* banner with a *Go to my channels* button
			And I see a *No channels have been published to the Community Library yet.* message
			And I see the following filters to the left of the page: *Search*, *Countries*, *Languages*, *Categories*
		When I click the *Go to my channels* button
		Then I am redirected to the *My channels* page

	Scenario: Community Library page overview (published channels)
		Given several channels have already been published to the Community Library
		When I look at the page
		Then I see the *Community Library* title
			And I see *Browse community-submitted channels approved for discovery in Studio. Copy a token to use a channel in Kolibri. What is the Community Library?*
			And I see a *Help grow the Community Library* banner with a *Go to my channels* button
			And I see the cards of all of the currently published channels
			And I see the following filters to the left of the page: *Search*, *Countries*, *Languages*, *Categories*

	Scenario: Filter channels at the Community Library page
		Given several channels have already been published to the Community Library
		When I enter a keyword in the *Search* field
		Then I see only the results matching the entered keyword
		When there are no results matching the entered keyword
		Then I see a *0 results found* text
			And I see a *No channels match the selected filters.* message
		When I click the *Clear all* link
		Then I see the full list with the available cards
		When apply any of the other available filters (*Countries*, *Languages*, *Categories*)
		Then I see only the results matching the applied filters
		When there are no results matching the applied filters
		Then I see a *0 results found* text
			And I see a *No channels match the selected filters.* message

	Scenario: See the card details and channel token
		Given several channels have already been published to the Community Library
		When I look at a community channel's card
		Then I see the channel's name, image, number of resources and countries
			And I see when the channel was published
			And I see an info icon and a *Copy channel token* icon
		When I click on the *Copy channel token* icon
		Then I see the *Copy channel token* modal
			And I can copy the channel token

	Scenario: See the details of a community channel
		Given several channels have already been published to the Community Library
		When I click on a community channel's card
		Then I see the community channel's details page
			And I see the channel image, name and description
			And I see values for the following fields: *Channel token*, *Published on*, *Published version*, *Primary language*, *Channel size*, *Total resources*, *Categories*, *Languages*, *Countries*, *Licenses*
		When I click the *X* icon
		Then I am back at the *Community Library* page
