# features/006_module_search.feature

Feature: Module search
  In order to do find topical material
  I can perform a fulltext search on a module

  @uninstall-kjv-after-scenario
  Scenario: Basic search
    Given the KJV is the only translation installed
    And I open the search menu
    And I enter the term "faith"
    When I perform the search
    Then the tab title is "Search: faith [KJV]"
    And there are 338 search results