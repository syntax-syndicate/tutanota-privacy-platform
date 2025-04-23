// We cannot use TS types here because it's used during build. Types for these things are still inferred.

export const Type = Object.freeze({
	Element: "ELEMENT_TYPE",
	ListElement: "LIST_ELEMENT_TYPE",
	DataTransfer: "DATA_TRANSFER_TYPE",
	Aggregated: "AGGREGATED_TYPE",
	BlobElement: "BLOB_ELEMENT_TYPE",
})

export const Cardinality = Object.freeze({
	// nullable values
	ZeroOrOne: "ZeroOrOne",
	// an array of zero or more values, never null
	Any: "Any",
	// exactly one non-null value
	One: "One",
})

export const AssociationType = Object.freeze({
	ElementAssociation: "ELEMENT_ASSOCIATION",
	ListAssociation: "LIST_ASSOCIATION",
	ListElementAssociationGenerated: "LIST_ELEMENT_ASSOCIATION_GENERATED",
	Aggregation: "AGGREGATION",
	BlobElementAssociation: "BLOB_ELEMENT_ASSOCIATION",
	ListElementAssociationCustom: "LIST_ELEMENT_ASSOCIATION_CUSTOM",
})

export const ValueType = Object.freeze({
	String: "String",
	Number: "Number",
	Bytes: "Bytes",
	Date: "Date",
	Boolean: "Boolean",
	GeneratedId: "GeneratedId",
	CustomId: "CustomId",
	CompressedString: "CompressedString",
})

export const ResourceType = Object.freeze({
	Persistence: "Persistence",
	Service: "Service",
})
