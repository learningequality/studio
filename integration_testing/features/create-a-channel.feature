Feature: Create a channel

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the *My Channels* tab

	Scenario: Create a channel
		When I click the *New channel* button
		Then I see the *New channel* page
		When I enter channel name <channel_name>
			And I enter channel description <channel_description>
			And I select a language <language>
			And I upload the image file as a channel thumbnail
			And I click the *Create* button
		Then I see the channel <channel_name> on *My Channels* list

	Examples:
	| channel_name  | channel_description  | language |
	| ck-12         | sample channel       | english  | 
