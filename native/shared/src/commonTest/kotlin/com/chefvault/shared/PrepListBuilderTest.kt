package com.chefvault.shared

import com.chefvault.shared.preplist.Stations
import kotlin.test.Test
import kotlin.test.assertEquals

class PrepListBuilderTest {

    @Test
    fun assign_matchesKeywordStation() {
        assertEquals("Protein & Seafood", Stations.assign("Salmon Fillet"))
        assertEquals("Produce & Aromatics", Stations.assign("Garlic Clove"))
        assertEquals("Dairy & Fats", Stations.assign("Olive Oil"))
        assertEquals("Dairy & Fats", Stations.assign("Parmesan Cheese"))
    }

    @Test
    fun assign_defaultsToDryGoods() {
        assertEquals("Dry Goods", Stations.assign("All-Purpose Flour"))
        assertEquals("Dry Goods", Stations.assign("Sea Salt"))
    }

    @Test
    fun tagFor_returnsStationTagOrAll() {
        assertEquals("GRILL", Stations.tagFor("Protein & Seafood"))
        assertEquals("SAUCIER", Stations.tagFor("Produce & Aromatics"))
        assertEquals("ALL", Stations.tagFor("Dry Goods"))
        assertEquals("ALL", Stations.tagFor("Unknown Station"))
    }
}
