package com.chefvault.shared.costing

import com.chefvault.shared.model.Ingredient
import kotlin.math.abs
import kotlin.math.floor

/**
 * Per-ingredient cost roll-up with partial-costing semantics. Faithful port of
 * `src/lib/costing.ts`. Currency formatting reproduces the app's `Intl.NumberFormat`
 * en-US USD output (the only currency the app uses today).
 */

data class IngredientCost(val name: String, val cost: Double?)

data class RecipeCostSummary(
    val ingredients: List<IngredientCost>,
    val totalCost: Double?,
    val totalCosted: Double,
    val costPerServing: Double?,
    val costedCount: Int,
    val totalCount: Int,
    val isComplete: Boolean,
)

fun calculateRecipeCost(ingredients: List<Ingredient>, servings: Int): RecipeCostSummary {
    val totalCount = ingredients.size
    var totalCosted = 0.0
    var costedCount = 0

    val ingredientCosts = ingredients.map { ing ->
        val cost = ing.costPerUnit?.let { it * ing.quantity }
        if (cost != null) {
            totalCosted += cost
            costedCount++
        }
        IngredientCost(ing.name, cost)
    }

    val isComplete = costedCount == totalCount && totalCount > 0
    val totalCost = if (isComplete) totalCosted else null
    val costPerServing = when {
        totalCost != null && servings > 0 -> totalCost / servings
        totalCosted > 0 && servings > 0 -> totalCosted / servings
        else -> null
    }

    return RecipeCostSummary(
        ingredients = ingredientCosts,
        totalCost = totalCost,
        totalCosted = totalCosted,
        costPerServing = costPerServing,
        costedCount = costedCount,
        totalCount = totalCount,
        isComplete = isComplete,
    )
}

fun calculateScaledCost(costPerUnit: Double?, scaledQuantity: Double): Double? {
    if (costPerUnit == null || costPerUnit.isNaN() || scaledQuantity.isNaN()) return null
    return costPerUnit * scaledQuantity
}

/**
 * Formats an amount as en-US USD ("$1,234.50", "-$5.00", "$0.00"), matching
 * `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. Only USD is
 * supported, mirroring the current app; [currency] is accepted for API parity.
 */
fun formatCurrency(amount: Double?, @Suppress("UNUSED_PARAMETER") currency: String = "USD"): String {
    if (amount == null || amount.isNaN()) return "—"
    val cents = floor(abs(amount) * 100 + 0.5).toLong() // jsRound on cents
    val whole = cents / 100
    val frac = cents % 100
    val sign = if (amount < 0) "-" else ""
    val fracStr = frac.toString().padStart(2, '0')
    return "$sign$${groupThousands(whole)}.$fracStr"
}

private fun groupThousands(value: Long): String {
    val s = value.toString()
    if (s.length <= 3) return s
    val sb = StringBuilder()
    val lead = s.length % 3
    var i = 0
    if (lead > 0) {
        sb.append(s.substring(0, lead))
        i = lead
    }
    while (i < s.length) {
        if (sb.isNotEmpty()) sb.append(",")
        sb.append(s.substring(i, i + 3))
        i += 3
    }
    return sb.toString()
}
