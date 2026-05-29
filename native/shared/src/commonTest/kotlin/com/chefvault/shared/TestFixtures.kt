package com.chefvault.shared

import com.chefvault.shared.model.Ingredient

/** Shared test factory for ingredients. Single definition avoids a Kotlin/Native clash
 * on synthetic `$default` functions when the same private helper is duplicated per file. */
internal fun ing(name: String, qty: Double, unit: String, cost: Double? = null): Ingredient =
    Ingredient(name = name, quantity = qty, unit = unit, costPerUnit = cost)
