package com.chefvault.android.ui.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlAppBar
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlSearchField
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Collection

@Composable
fun CollectionsTab(sdk: ChefVaultSDK) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "grid") {
        composable("grid") {
            CollectionsGridScreen(
                sdk,
                onOpen = { id -> nav.navigate("detail/$id") },
                onCreate = { nav.navigate("create") },
            )
        }
        composable("detail/{id}") { entry ->
            CollectionDetailScreen(
                sdk,
                collectionId = entry.arguments?.getString("id").orEmpty(),
                onBack = { nav.popBackStack() },
            )
        }
        composable("create") {
            CreateCollectionScreen(sdk, onDone = { nav.popBackStack() })
        }
    }
}

@Composable
private fun CollectionsGridScreen(sdk: ChefVaultSDK, onOpen: (String) -> Unit, onCreate: () -> Unit) {
    val collections by sdk.collections.collections.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }

    val filtered = remember(collections, query) {
        if (query.isBlank()) collections
        else collections.filter {
            it.name.contains(query, ignoreCase = true) ||
                (it.description?.contains(query, ignoreCase = true) == true)
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize().padding(top = 8.dp)) {
            SlAppBar(title = "Collections", kicker = "Grouped recipes", count = collections.size.toString())
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 4.dp, bottom = 96.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                    Column(Modifier.padding(bottom = 4.dp)) {
                        SlSearchField(value = query, onValueChange = { query = it }, placeholder = "Search collections…")
                    }
                }
                items(filtered, key = { it.id }) { collection ->
                    CollectionCard(collection) { onOpen(collection.id) }
                }
                item { NewCollectionTile(onCreate) }
            }
        }
    }
}

@Composable
private fun CollectionCard(collection: Collection, onClick: () -> Unit) {
    val sl = LocalSl.current
    val count = collection.recipeIds.size
    Column(
        Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(sl.surface)
            .border(1.dp, sl.line, RoundedCornerShape(16.dp))
            .clickable { onClick() },
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(78.dp)
                .background(collectionToneBrush(collection.id)),
            contentAlignment = Alignment.BottomStart,
        ) {
            Text(
                count.toString().padStart(2, '0'),
                style = slMono(10.0, FontWeight.Bold),
                color = sl.accent,
                modifier = Modifier.padding(11.dp),
            )
        }
        Column(Modifier.padding(start = 12.dp, end = 12.dp, top = 10.dp, bottom = 12.dp)) {
            Text(collection.name, style = slDisplay(13.5, FontWeight.Bold), color = sl.text, maxLines = 2)
            Text(
                "$count ${if (count == 1) "recipe" else "recipes"}",
                style = slBody(11.0),
                color = sl.muted,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun NewCollectionTile(onClick: () -> Unit) {
    val sl = LocalSl.current
    Column(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 142.dp)
            .clip(RoundedCornerShape(16.dp))
            .drawBehind {
                drawRoundRect(
                    color = sl.line2,
                    style = Stroke(
                        width = 1.5.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 12f)),
                    ),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()),
                )
            }
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(7.dp, Alignment.CenterVertically),
    ) {
        Icon(Icons.Filled.Add, contentDescription = null, tint = sl.accent, modifier = Modifier.size(28.dp))
        Text("New Collection", style = slBody(12.0, FontWeight.SemiBold), color = sl.muted)
    }
}
