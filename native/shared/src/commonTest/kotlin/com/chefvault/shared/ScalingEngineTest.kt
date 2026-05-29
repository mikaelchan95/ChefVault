package com.chefvault.shared

import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.scaling.aggregateIngredients
import com.chefvault.shared.scaling.convertToSystem
import com.chefvault.shared.scaling.scaleIngredient
import kotlin.test.Test
import kotlin.test.assertEquals

class ScalingEngineTest {

    @Test
    fun proportionalMetricScaling_matchesSpecExamples() {
        // Spec §5.3: 4 → 10 servings.
        val butter = scaleIngredient(ing("Butter", 200.0, "g"), 4, 10)
        assertEquals(500.0, butter.quantity, 1e-9)
        assertEquals("g", butter.unit)

        val cream = scaleIngredient(ing("Cream", 300.0, "ml"), 4, 10)
        assertEquals(750.0, cream.quantity, 1e-9)
        assertEquals("ml", cream.unit)
    }

    @Test
    fun metricPromotion_gramsToKilograms() {
        // 500 g scaled 1 → 3 = 1500 g → promoted to 1.5 kg.
        val r = scaleIngredient(ing("Flour", 500.0, "g"), 1, 3)
        assertEquals(1.5, r.quantity, 1e-9)
        assertEquals("kg", r.unit)
    }

    @Test
    fun metricPromotion_millilitersToLiters() {
        // 1200 ml → 1.2 L, then kitchenRound (1–10 → quarter steps): round(4.8)/4 = 1.25.
        val r = scaleIngredient(ing("Stock", 400.0, "ml"), 1, 3)
        assertEquals(1.25, r.quantity, 1e-9)
        assertEquals("L", r.unit)
    }

    @Test
    fun kitchenRounding_halfUp_belowOne() {
        // 1 g scaled 4 → 1 = 0.25 g → round(2.5)/10 = 0.3 (JS Math.round half-up).
        val r = scaleIngredient(ing("Salt", 1.0, "g"), 4, 1)
        assertEquals(0.3, r.quantity, 1e-9)
        assertEquals("g", r.unit)
    }

    @Test
    fun convertToSystem_gramsToImperial_picksPounds() {
        val c = convertToSystem(1000.0, "g", MeasurementSystem.IMPERIAL)
        assertEquals("lb", c.unit)
        assertEquals(1000.0 / 453.592, c.quantity, 1e-6)
    }

    @Test
    fun convertToSystem_smallVolumeToImperial_picksTeaspoons() {
        val c = convertToSystem(10.0, "ml", MeasurementSystem.IMPERIAL)
        assertEquals("tsp", c.unit)
        assertEquals(10.0 / 4.929, c.quantity, 1e-6)
    }

    @Test
    fun convertToSystem_metricPromotesWhenAlreadyMetric() {
        val c = convertToSystem(1500.0, "ml", MeasurementSystem.METRIC)
        assertEquals("L", c.unit)
        assertEquals(1.5, c.quantity, 1e-9)
    }

    @Test
    fun convertToSystem_neutralUnitUnchanged() {
        val c = convertToSystem(5.0, "pc", MeasurementSystem.IMPERIAL)
        assertEquals("pc", c.unit)
        assertEquals(5.0, c.quantity, 1e-9)
    }

    @Test
    fun scaleIngredient_imperialPreference_roundsForKitchen() {
        // 1000 g → 2.20462 lb → kitchenRound (≥1, quarter steps) → 2.25 lb.
        val r = scaleIngredient(ing("Sugar", 1000.0, "g"), 1, 1, MeasurementSystem.IMPERIAL)
        assertEquals(2.25, r.quantity, 1e-9)
        assertEquals("lb", r.unit)
    }

    @Test
    fun aggregateIngredients_sumsByNameAndUnit_sortedByName() {
        val result = aggregateIngredients(
            listOf(
                ing("Olive Oil", 100.0, "ml"),
                ing("olive oil", 50.0, "ml"),
                ing("Garlic", 2.0, "pc"),
            ),
        )
        assertEquals(2, result.size)
        // Sorted by (lowercased) name: garlic before olive oil.
        assertEquals("garlic", result[0].name)
        assertEquals(2.0, result[0].quantity, 1e-9)
        assertEquals("pc", result[0].unit)
        assertEquals("olive oil", result[1].name)
        assertEquals(150.0, result[1].quantity, 1e-9)
        assertEquals("ml", result[1].unit)
    }
}
