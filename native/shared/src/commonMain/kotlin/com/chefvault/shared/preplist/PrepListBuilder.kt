package com.chefvault.shared.preplist

/**
 * Kitchen-station model and keyword-based assignment for prep lists. Faithful port of
 * the STATION_MAP / STATION_TAGS logic currently embedded in `src/stores/recipeStore.ts`.
 */
object Stations {
    val ALL: List<String> = listOf(
        "Protein & Seafood",
        "Produce & Aromatics",
        "Dairy & Fats",
        "Dry Goods",
    )

    val TAGS: Map<String, String> = mapOf(
        "Protein & Seafood" to "GRILL",
        "Produce & Aromatics" to "SAUCIER",
        "Dairy & Fats" to "PASTRY",
        "Dry Goods" to "ALL",
    )

    // Insertion order matters: first keyword match wins (mirrors Object.entries iteration in TS).
    private val MAP: Map<String, String> = linkedMapOf(
        "salmon" to "Protein & Seafood",
        "chicken" to "Protein & Seafood",
        "beef" to "Protein & Seafood",
        "fish" to "Protein & Seafood",
        "pork" to "Protein & Seafood",
        "shrimp" to "Protein & Seafood",
        "garlic" to "Produce & Aromatics",
        "shallot" to "Produce & Aromatics",
        "ginger" to "Produce & Aromatics",
        "thyme" to "Produce & Aromatics",
        "mushroom" to "Produce & Aromatics",
        "potato" to "Produce & Aromatics",
        "avocado" to "Produce & Aromatics",
        "vegetable" to "Produce & Aromatics",
        "lemon" to "Produce & Aromatics",
        "cream" to "Dairy & Fats",
        "butter" to "Dairy & Fats",
        "oil" to "Dairy & Fats",
        "parmesan" to "Dairy & Fats",
        "tahini" to "Dairy & Fats",
        "cheese" to "Dairy & Fats",
    )

    /** Returns the station for an ingredient name, defaulting to "Dry Goods". */
    fun assign(name: String): String {
        val lower = name.lowercase()
        for ((keyword, station) in MAP) {
            if (lower.contains(keyword)) return station
        }
        return "Dry Goods"
    }

    fun tagFor(station: String): String = TAGS[station] ?: "ALL"
}
