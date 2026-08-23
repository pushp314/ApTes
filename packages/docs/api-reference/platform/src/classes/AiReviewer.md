[**sentinel**](../../../README.md)

***

# Class: AiReviewer

AiReviewer acts as an optional assistant that reviews findings.
It enforces strict separation of deterministic rules and AI assessment,
and tracks a hard budget.

## Constructors

### Constructor

> **new AiReviewer**(`options`, `projectDir?`): `AiReviewer`

#### Parameters

##### options

`Partial`\<[`AiReviewerOptions`](../interfaces/AiReviewerOptions.md)\> & `object`

##### projectDir?

`string` = `...`

#### Returns

`AiReviewer`

## Methods

### review()

> **review**(`findings`): `Promise`\<`Finding`[]\>

Reviews an array of findings. If AI is disabled or budget is 0, returns them untouched.
Otherwise, processes only 'low' confidence findings, utilizing batching and cache.

#### Parameters

##### findings

`Finding`[]

#### Returns

`Promise`\<`Finding`[]\>
