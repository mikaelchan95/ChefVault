package com.chefvault.shared

import com.chefvault.shared.costing.calculateRecipeCost
import com.chefvault.shared.costing.calculateScaledCost
import com.chefvault.shared.costing.formatCurrency
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CostingEngineTest {

    @Test
    fun fullyCosted_rollsUpTotalAndPerServing() {
        val summary = calculateRecipeCost(listOf(ing("Salmon", 1.0, "kg", 12.6)), servings = 4)
        assertTrue(summary.isComplete)
        assertEquals(12.6, summary.totalCost!!, 1e-9)
        assertEquals(3.15, summary.costPerServing!!, 1e-9)
        assertEquals(1, summary.costedCount)
        assertEquals(1, summary.totalCount)
    }

    @Test
    fun partiallyCosted_totalNull_butPerServingFromCostedPortion() {
        val summary = calculateRecipeCost(
            listOf(ing("A", 1.0, "g", 10.0), ing("B", 1.0, "g", null)),
            servings = 2,
        )
        assertEquals(false, summary.isComplete)
        assertNull(summary.totalCost)
        assertEquals(10.0, summary.totalCosted, 1e-9)
        assertEquals(5.0, summary.costPerServing!!, 1e-9)
        assertEquals(1, summary.costedCount)
        assertEquals(2, summary.totalCount)
    }

    @Test
    fun noCosts_perServingNull() {
        val summary = calculateRecipeCost(listOf(ing("A", 1.0, "g", null)), servings = 2)
        assertEquals(false, summary.isComplete)
        assertNull(summary.totalCost)
        assertEquals(0.0, summary.totalCosted, 1e-9)
        assertNull(summary.costPerServing)
    }

    @Test
    fun scaledCost_multipliesOrReturnsNull() {
        assertEquals(6.0, calculateScaledCost(2.0, 3.0)!!, 1e-9)
        assertNull(calculateScaledCost(null, 3.0))
    }

    @Test
    fun formatCurrency_matchesIntlEnUsUsd() {
        assertEquals("—", formatCurrency(null))
        assertEquals("$0.00", formatCurrency(0.0))
        assertEquals("$12.60", formatCurrency(12.6))
        assertEquals("$3.15", formatCurrency(3.15))
        assertEquals("$1,234.50", formatCurrency(1234.5))
        assertEquals("$1,000,000.00", formatCurrency(1000000.0))
        assertEquals("-$5.00", formatCurrency(-5.0))
    }
}
