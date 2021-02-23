Feature: Deploy Channel

	Background: 
		Given I am signed in to Studio as <username>
			And I have uploaded content to the staging tree for <channel_id>

	Scenario: Deploy Channel
		When I go to the URL https://api.studio.learningequality.org/channels/<channel_id>/staging
		 And I click the *Deploy Channel* button at the top right
		Then I see the deploy channel confirmation box
		When I click the *Deploy* button
		Then I get redirected to https://api.studio.learningequality.org/channels/<channel_id>/edit/<channel_id[0:6]>

	Examples: 
	| username | channel_id |