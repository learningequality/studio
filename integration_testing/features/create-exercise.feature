Feature: Create an exercise

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page

	Scenario: Create an exercise
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
			And I can set the exercise title, description and tags
			And I can select the mastery criteria
			And I can choose if the questions are randomized
			And I can add/change a thumbnail
			And I can select language and visibility
			And I can fill in the copyright information
		When I click the *Questions* tab
			And I click the *New question* button
		Then I can add the question text and images in the question editor field
			And I can select the response type
			And I can provide answers for each question
			And I can provide hints for each question
			And I can randomize the answer order
		When I click the *Related* tab
			Then I can click *Add previous step* and or *Add next step*
				And I can click the *Add* button to add a step
		When I click the *Finish* button
		Then I am returned at the main topic tree view
