package com.chefvault.shared.scaling

import com.chefvault.shared.model.AggregatedIngredient
import com.chefvault.shared.model.Ingredient
import com.chefvault.shared.model.MeasurementSystem
import kotlin.math.floor

/**
 * Proportional recipe scaling with kitchen rounding and metric/imperial conversion.
 * Faithful port of `src/lib/scaling.ts`. Pure and deterministic — covered by
 * golden-value tests that mirror the original TypeScript output.
 */

private enum class UnitSystem { METRIC, IMPERIAL, NEUTRAL }

private enum class UnitCategory { WEIGHT, VOLUME, NEUTRAL }

private data class UnitMeta(val system: UnitSystem, val category: UnitCategory, val toBase: Double)

private val UNIT_META: Map<String, UnitMeta> = mapOf(
    "g" to UnitMeta(UnitSystem.METRIC, UnitCategory.WEIGHT, 1.0),
    "kg" to UnitMeta(UnitSystem.METRIC, UnitCategory.WEIGHT, 1000.0),
    "oz" to UnitMeta(UnitSystem.IMPERIAL, UnitCategory.WEIGHT, 28.3495),
    "lb" to UnitMeta(UnitSystem.IMPERIAL, UnitCategory.WEIGHT, 453.592),
    "ml" to UnitMeta(UnitSystem.METRIC, UnitCategory.VOLUME, 1.0),
    "L" to UnitMeta(UnitSystem.METRIC, UnitCategory.VOLUME, 1000.0),
    "tsp" to UnitMeta(UnitSystem.IMPERIAL, UnitCategory.VOLUME, 4.929),
    "tbsp" to UnitMeta(UnitSystem.IMPERIAL, UnitCategory.VOLUME, 14.787),
    "cup" to UnitMeta(UnitSystem.IMPERIAL, UnitCategory.VOLUME, 236.588),
    "pc" to UnitMeta(UnitSystem.NEUTRAL, UnitCategory.NEUTRAL, 1.0),
)

data class ScaledIngredient(
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String?,
    val originalQuantity: Double,
    val originalUnit: String,
)

data class Converted(val quantity: Double, val unit: String)

/** Matches JavaScript `Math.round` (round half up toward +Infinity). Quantities are non-negative. */
private fun jsRound(value: Double): Double = floor(value + 0.5)

private fun kitchenRound(value: Double): Double = when {
    value >= 100 -> jsRound(value)
    value >= 10 -> jsRound(value * 2) / 2
    value >= 1 -> jsRound(value * 4) / 4
    else -> jsRound(value * 10) / 10
}

private fun selectBestUnit(
    baseValue: Double,
    category: UnitCategory,
    targetSystem: MeasurementSystem,
): Converted {
    if (category == UnitCategory.WEIGHT) {
        if (targetSystem == MeasurementSystem.IMPERIAL) {
            val oz = baseValue / UNIT_META.getValue("oz").toBase
            if (oz < 16) return Converted(oz, "oz")
            return Converted(baseValue / UNIT_META.getValue("lb").toBase, "lb")
        }
        if (baseValue < 1000) return Converted(baseValue, "g")
        return Converted(baseValue / 1000.0, "kg")
    }

    if (category == UnitCategory.VOLUME) {
        if (targetSystem == MeasurementSystem.IMPERIAL) {
            val tsp = baseValue / UNIT_META.getValue("tsp").toBase
            if (tsp < UNIT_META.getValue("tbsp").toBase / UNIT_META.getValue("tsp").toBase) {
                return Converted(tsp, "tsp")
            }
            val tbsp = baseValue / UNIT_META.getValue("tbsp").toBase
            if (tbsp < UNIT_META.getValue("cup").toBase / UNIT_META.getValue("tbsp").toBase) {
                return Converted(tbsp, "tbsp")
            }
            return Converted(baseValue / UNIT_META.getValue("cup").toBase, "cup")
        }
        if (baseValue < 1000) return Converted(baseValue, "ml")
        return Converted(baseValue / 1000.0, "L")
    }

    return Converted(baseValue, "pc")
}

private fun promoteMetric(quantity: Double, unit: String): Converted = when {
    unit == "g" && quantity >= 1000 -> Converted(quantity / 1000.0, "kg")
    unit == "ml" && quantity >= 1000 -> Converted(quantity / 1000.0, "L")
    else -> Converted(quantity, unit)
}

fun convertToSystem(quantity: Double, unit: String, targetSystem: MeasurementSystem): Converted {
    val meta = UNIT_META[unit] ?: return Converted(quantity, unit)
    if (meta.system == UnitSystem.NEUTRAL) return Converted(quantity, unit)

    val targetUnitSystem =
        if (targetSystem == MeasurementSystem.METRIC) UnitSystem.METRIC else UnitSystem.IMPERIAL
    if (meta.system == targetUnitSystem) {
        return if (targetSystem == MeasurementSystem.METRIC) promoteMetric(quantity, unit)
        else Converted(quantity, unit)
    }

    val baseValue = quantity * meta.toBase
    val converted = selectBestUnit(baseValue, meta.category, targetSystem)
    return if (targetSystem == MeasurementSystem.METRIC) {
        promoteMetric(converted.quantity, converted.unit)
    } else {
        converted
    }
}

fun scaleIngredient(
    ingredient: Ingredient,
    baseServings: Int,
    targetServings: Int,
    preferredSystem: MeasurementSystem? = null,
): ScaledIngredient {
    val ratio = targetServings.toDouble() / baseServings.toDouble()
    var scaledQty = ingredient.quantity * ratio
    var unit = ingredient.unit

    if (preferredSystem != null) {
        val result = convertToSystem(scaledQty, unit, preferredSystem)
        scaledQty = result.quantity
        unit = result.unit
    } else {
        val promoted = promoteMetric(scaledQty, unit)
        scaledQty = promoted.quantity
        unit = promoted.unit
    }

    return ScaledIngredient(
        name = ingredient.name,
        quantity = kitchenRound(scaledQty),
        unit = unit,
        notes = ingredient.notes,
        originalQuantity = ingredient.quantity,
        originalUnit = ingredient.unit,
    )
}

fun scaleRecipeIngredients(
    ingredients: List<Ingredient>,
    baseServings: Int,
    targetServings: Int,
    preferredSystem: MeasurementSystem? = null,
): List<ScaledIngredient> =
    ingredients.map { scaleIngredient(it, baseServings, targetServings, preferredSystem) }

fun aggregateIngredients(allIngredients: List<Ingredient>): List<AggregatedIngredient> {
    val map = LinkedHashMap<String, Pair<Double, String>>()
    for (ing in allIngredients) {
        val key = "${ing.name.lowercase()}|${ing.unit}"
        val existing = map[key]
        map[key] = if (existing != null) (existing.first + ing.quantity) to existing.second
        else ing.quantity to ing.unit
    }
    return map.entries
        .map { (key, value) ->
            AggregatedIngredient(
                name = key.split("|")[0],
                quantity = kitchenRound(value.first),
                unit = value.second,
            )
        }
        .sortedBy { it.name }
}
