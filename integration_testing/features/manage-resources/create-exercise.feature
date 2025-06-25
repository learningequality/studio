Feature: Create an exercise

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page

	Scenario: Create an exercise with questions of type *Single choice*
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in the required fields (*Title*, *Completion* and *Goal*)
			And I click the *Questions* tab
		Then I see the *New question* button
		When I click the *New question* button
		Then I see the question editor
			And I see that *Single choice* is the default *Response type*
		When I fill in the question text in the question editor field
			And I add an image
			And I provide answers
			And I select one answer as the correct answer
			And I provide a hint
		Then I've completed the creation of the question of type *Single choice* #repeat the same steps to add as many questions as necessary
		When I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the newly created exercise

	Scenario: Create an exercise with questions of type *Multiple choice*
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in the required fields (*Title*, *Completion* and *Goal*)
			And I click the *Questions* tab
		Then I see the *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I select the *Multiple choice* option from the *Response type* drop-down
			And I fill in the question text in the question editor field
			And I add an image
			And I provide answers
			And I select at least one answer as the correct answer
			And I provide a hint
		Then I've completed the creation of the question of type *Multiple choice* #repeat the same steps to add as many questions as necessary
		When I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the newly created exercise

	Scenario: Create an exercise with questions of type *Numeric input*
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in the required fields (*Title*, *Completion* and *Goal*)
			And I click the *Questions* tab
		Then I see the *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I select the *Numeric input* option from the *Response type* drop-down
			And I fill in the question text in the question editor field
			And I provide answers
			And I provide a hint
		Then I've completed the creation of the question of type *Numeric input* #repeat the same steps to add as many questions as necessary
		When I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the newly created exercise

	Scenario: Create an exercise with questions of type *True/False*
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in the required fields (*Title*, *Completion* and *Goal*)
			And I click the *Questions* tab
		Then I see the *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I select the *True/False* option from the *Response type* drop-down
			And I fill in the question text in the question editor field
			And I select either *True* or *False* as the correct answer
			And I provide a hint
		Then I've completed the creation of the question of type *True/False* #repeat the same steps to add as many questions as necessary
		When I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the newly created exercise
