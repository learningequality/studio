Feature: View metadata in previewers across Studio
	How the new metadata is laid out on previewers

	Background:
		Given I am signed into Studio
			And I am in an editable channel

	Scenario: View .PDF or .EPUB previewer
		When I left-click a .PDF or .EPUB
		Then I see the previewer panel
			And I see a learning activity label
			And I see text fields for: *Level*, *Learning activity*, *Completion*, *Category*, and *Accessibility*

	Scenario: View .MP3 previewer
		When I left-click an .MP3
		Then I see the previewer panel
			And I see a learning activity label
			And I see text fields for: *Level*, *Learning activity*, *Completion*, *Category*, and *Captions and subtitles*

	Scenario: View .MP4 or .MOV previewer
		When I left-click a .MP4 or .MOV
		Then I see the previewer panel
			And I see a learning activity label
			And I see text fields for: *Level*, *Learning activity*, *Completion*, *Category*, *Accessibility*, , and *Captions and subtitles*

	Scenario: View Practice previewer
		When I left-click an exercise
		Then I see the previewer panel
		When I click the *Details* tab
		Then I see a learning activity label
			And I see text fields for: *Level*, *Learning activity*, *Completion*, *Category*, and *Accessibility*

	Scenario: View previewer with multiple activities
		Given a resource has multiple learning activities set
		When I left-click the resource
		Then I see the previewer panel
			And I see multiple learning activity labels

	Scenario: View previewer with empty fields
		Given a resource has an empty metadata field
		When I left-click the resource
		Then I see the previewer panel
			And I see there is a *–* in the field
