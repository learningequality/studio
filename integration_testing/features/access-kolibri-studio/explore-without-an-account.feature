Feature: Explore without an account

	Background:
		Given I am not signed in to Studio
			And I am on Studio sign-in page

	Scenario: Explore without an account
		When I click the *Explore without an account* link
		Then I see the *Content Library* page with available public channels
			And I can filter the search results by keyword, language, license, format, starred status, resources for coaches, captions or subtitles
		When I click on a channel card
		Then I can see the channel's details
			And I can view or download the channel summary
