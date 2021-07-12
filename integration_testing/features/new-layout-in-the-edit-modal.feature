Feature: New layout in the edit modal
User can see new fields: learning level, learning activity, what you will need, duration, completion, for beginners, accessibility, and category

# Comment here

	Background: 
		Given I am signed into Studio
			And I am in an editable channel

	Scenario: View .PDF/.EPUB layout
		When I right click a .PDF or .EPUB resource
		Then I see an options menu for that .PDF or .EPUB
		When I click *Edit details*
		Then I see *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category* dropdowns under the *Basic information* section
			And I see a *Completion* section underneath the *Basic information* section
			And I see a *For beginners* checkbox in the Audience section
			And I see an *Accessibility* section underneath the *Audience* section 

Scenario: View .MP3 layout
		When I right click an .MP3 resource
		Then I see an options menu for that .MP3
		When I click *Edit details*
		Then I see *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category* dropdowns under the *Basic information* section
			And I see a *Completion* section underneath the *Basic information* section
			And I see a *For beginners* checkbox in the Audience section
			And I see *Captions and subtitles* underneath the *Source* section

Scenario: View .MP4 / .MOV layout
		When I right click an .MP4 or .MOV resource
		Then I see an options menu for that .MP4 or .MOV
		When I click *Edit details*
		Then I see *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category* dropdowns under the *Basic information* section
			And I see a *Completion* section underneath the *Basic information* section
			And I see a *Completion* dropdown under the *Completion* section
			And I see *Allow learners to mark as complete* under the *Completion* section
			And I see a *For beginners* checkbox in the Audience section
			And I see an *Accessibility* section underneath the *Audience* section

Scenario: View *Practice* resource layout
		When I right click a *Practice* resource
		Then I see an options menu for that *Practice* resource
		When I click *Edit details*
		Then I see *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category* dropdowns under the *Basic information* section
			And I see an *Assessment options* section underneath the *Basic information* section
			And I see a *Completion* section underneath the *Assessment options* section
			And I see a *For beginners* checkbox in the Audience section
			And I see an *Accessibility* section underneath the *Audience* section

Scenario: View .ZIP resource layout
		When I right click a *.ZIP* resource
		Then I see an options menu for that *.ZIP* resource
		When I click *Edit details*
		Then I see *Title*, *Description*, *Learning activity*, *Level*, *What you will need*, *Tags*, and *Category* dropdowns under the *Basic information* section
			And I see an *Assessment options* section underneath the *Basic information* section
			And I see a *Completion* section underneath the *Assessment options* section
			And I see a *For beginners* checkbox in the Audience section
			And I see an *Accessibility* section underneath the *Audience* section


Examples:
| ???      | ??? | 
| ?????!?! |
