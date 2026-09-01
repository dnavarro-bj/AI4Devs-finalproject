package com.cactify.application.dto

/**
 * DTOs de catálogo. Los identificadores son `String`: en el API viajan como cadena decimal para
 * que un cliente JavaScript no los redondee (ADR-008).
 */
data class LocationResponse(val id: String, val name: String)

data class TagResponse(val id: String, val name: String)
