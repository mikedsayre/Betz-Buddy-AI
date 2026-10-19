# Math invariants

`MATH_VERSION` starts at `1` when code exists. Any formula or rounding change increments it and updates this file, the decision log, and the tests in the same change.

Zero language-model involvement in these functions.

## Conversions

One path only. Implied probability comes from decimal odds, so the two American formulas cannot drift apart.

- American `> 0`: decimal = `1 + odds / 100`
- American `< 0`: decimal = `1 + 100 / abs(odds)`
- American `0`, non-finite, or decimal `<= 1`: reject the price. Do not emit an opportunity.
- Implied probability = `1 / decimal`
- Decimal to American is display-only. If decimal `>= 2`, American = `round((decimal - 1) * 100)`. If decimal `< 2`, American = `round(-100 / (decimal - 1))`.

## Two-way de-vig

For a matched pair only:

- `fairProbA = impliedA / (impliedA + impliedB)`
- `fairProbB = impliedB / (impliedA + impliedB)`
- `fairProbA + fairProbB = 1` within `1e-9`
- `vigPercent = (impliedA + impliedB - 1) * 100`
- Fair American values are `decimalToAmerican(1 / fairProb)` and are not stored as calculation inputs

If either implied probability is outside `(0, 1)`, reject the pair. A sum of exactly `1` is zero vig and is valid. A sum below `1` is excluded from the desk and counted as a data-quality drop: inside one book it is usually a bad pair, and it must not be shown as a silent negative-vig edge.

## Pairing

| Market | Pair rule |
| --- | --- |
| `h2h` | The two named sides. No point. Sports in MVP are two-way moneylines. |
| `spreads` | Team A at `-P` pairs only with Team B at `+P` for the same absolute `P`. |
| `totals` | Over `P` pairs only with Under `P`. |

Do not average American odds. Do not pair different points. Do not de-vig a side against a different book's opposite side unless that book's own pair is incomplete and the consensus rule in the architecture doc is in force.

## Expected value

`evPercent = ((trueProb * targetDecimalOdds) - 1) * 100`

`trueProb` is the fair probability of the side being bet. `targetDecimalOdds` is the retail book's decimal price for that same side and point.

## Kelly stake

- `b = decimalOdds - 1`
- `q = 1 - trueProb`
- `f = (b * trueProb - q) / b`
- If `b <= 0` or `f <= 0` or bankroll `<= 0` or multiplier `<= 0`, stake is `0`
- Otherwise stake = `f * kellyMultiplier * bankroll`
- Stake is capped at bankroll
- Display rounds to the nearest cent at the edge. The unrounded stake stays on the audit object
- Default multiplier is `0.25`

EV does not depend on bankroll. Changing bankroll or Kelly fraction recomputes stake only.

## Verification gate

Before a row is returned, a second function recomputes fair probabilities, EV, and raw Kelly from the stored American inputs, benchmark source, bankroll, and multiplier.

Reject the row when:

- recomputed fair probs differ by more than `1e-9`
- recomputed EV differs by more than `1e-6` percentage points
- recomputed raw stake differs by more than `1e-6` dollars

Each returned opportunity carries `mathVersion` and a `mathAudit` with the inputs and intermediate values so a human can re-do the arithmetic.

## Worked reference (locked for the first tests)

Prices: side A `-110`, side B `-110`.

- Decimal both sides = `1.909090...` (`1 + 100/110`)
- Implied both sides = `0.523809...`
- Fair prob both sides = `0.5`
- Vig percent = `4.761904...`
- Target retail price `+100` (decimal `2`) on side A, true prob `0.5`
- EV = `((0.5 * 2) - 1) * 100` = `0`
- Kelly `f` at `+100` and `p=0.5` is `0`, stake `0`

Second reference: true prob `0.55`, decimal odds `2`, bankroll `1000`, multiplier `0.25`.

- EV = `((0.55 * 2) - 1) * 100` = `10`
- `b = 1`, `q = 0.45`, `f = 0.10`
- Stake = `25`

These two cases are the first unit tests. Add more before UI work is considered done.
