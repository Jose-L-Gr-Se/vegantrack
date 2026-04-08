# VeganTrack Owner Plan 30/60/90

## Product Thesis

VeganTrack should not try to beat MyFitnessPal or Cronometer on breadth.
It should win on one sharp promise:

> The clearest and most useful nutrition app for vegans who want to eat well
> every day without obsession.

That means:

- trustworthy vegan-specific guidance
- fast daily logging
- clear coverage of the nutrients that actually matter
- visible actionability, not just passive tracking

## What We Can Honestly Promise Now

Today the product already has real foundations:

- diary logging
- search and barcode scan
- custom foods
- recipes
- supplements
- weight tracking
- vegan-specific micronutrient logic
- subscription model

But the current product still has 3 gaps between potential and reality:

1. Reliability gap
   The backend and RLS need to be treated as part of the product promise.

2. Utility gap
   The daily workflow is good, but still slower and less "habit-forming" than
   the best competitors.

3. Differentiation gap
   We already store more vegan-relevant nutrition than we expose in the UI.

## Strategic Focus

### Pillar 1: Trust

Users should feel:

- "I can trust this app with my health decisions."
- "If the app is not sure, it tells me clearly."
- "The app helps me cover the nutrients that matter for a vegan diet."

### Pillar 2: Daily Speed

Users should feel:

- "Logging takes seconds."
- "I do not have to rebuild my routine every day."
- "The app remembers how I really eat."

### Pillar 3: Vegan Intelligence

Users should feel:

- "This app understands vegan nutrition better than general trackers."
- "It helps me act, not just measure."
- "It tells me what to improve today."

## 30-Day Plan

### Goal

Make the product safe to scale and good enough to advertise aggressively.

### Outcomes

- backend truth aligned with repo
- no obvious data integrity risks
- clearer product promise
- better first-week retention from habit-friendly flows

### Workstreams

#### 1. Platform and Data Trust

- sync repo schema with production reality
- document current RLS and recommended RLS
- harden `food_cache` to avoid shared cache poisoning
- audit Stripe entitlement flow and bind checkout to authenticated user
- define "trusted", "estimated", and "unknown" nutrition states

#### 2. Core UX Speed

- add "copy meal"
- add "copy previous day"
- add favorites / remembered meals
- improve quick-add from recents
- improve no-result flow with custom food + recipe suggestion

#### 3. First Differentiation Layer

- surface iodine and selenium where useful
- show nutrient confidence more explicitly
- highlight fortified foods
- add simple daily recommendations:
  - "you are low on B12 today"
  - "calcium coverage is weak"
  - "protein is almost done"

## 60-Day Plan

### Goal

Turn VeganTrack from "good vegan tracker" into "the one that helps me eat
better every day".

### Outcomes

- daily recommendations feel smart
- logging becomes meaningfully faster
- product starts to build emotional attachment

### Workstreams

#### 1. Vegan Guidance Engine

- confidence labels for vegan suitability
- enriched/fortified food tagging
- better use of `nutrient_overrides`
- action-oriented nutrient guidance by day
- weekly vegan coverage summary

#### 2. Meal System

- saved meals / templates
- recurring breakfasts or routines
- recipe-to-diary flow improvements
- meal-level targets or meal composition feedback

#### 3. Messaging and Positioning

- rewrite landing around the real promise
- align Pro paywall with actual user value
- collect testimonials based on outcomes, not aesthetics

## 90-Day Plan

### Goal

Become meaningfully unique in the category.

### Outcomes

- clearly differentiated value proposition
- defensible product story
- stronger conversion from free to Pro

### Workstreams

#### 1. Planning Layer

- lightweight weekly planning
- shopping-list generation from recipes and repeated meals
- nutrient-aware meal suggestions

#### 2. Trust Layer

- richer provenance for nutrition data
- explicit "from label", "from override", "estimated", "unknown"
- better product detail explanation screens

#### 3. Growth Layer

- onboarding tailored to vegan goals
- retention messaging around nutrient wins and streaks
- content loops that reinforce expertise

## Priorities Right Now

If we do only 5 things first, they should be:

1. Harden `food_cache`.
2. Audit Stripe entitlement flow.
3. Add saved meals / copy meal / copy day.
4. Expose vegan-specific nutrient confidence more clearly.
5. Surface iodine, selenium, and fortified food logic where it creates visible value.

## Success Metrics

These are the metrics that matter before scaling paid acquisition harder:

- signup to first food logged
- first-week retention
- percentage of users who log at least 3 days in week 1
- search success rate
- percentage of days with a clear actionable recommendation shown
- Pro conversion after repeated value exposure

## Message We Should Advertise

Short version:

> Track your vegan nutrition with clarity.

More concrete version:

> Protein, key micronutrients, supplements, and real daily guidance for vegan
> nutrition in one calm app.

What we should avoid claiming until trust is stronger:

- "most accurate"
- "complete nutritional analysis"
- "best scanner"
- "better than Cronometer"

## Immediate Build Order

### Phase 1

- security hardening
- backend truth
- daily logging speed

### Phase 2

- vegan intelligence surfaces
- confidence labels
- fortified food visibility

### Phase 3

- planning
- shopping list
- premium expansion
