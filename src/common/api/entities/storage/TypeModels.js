// This is an automatically generated file, please do not edit by hand!

// You should not use it directly, please use `resolveTypReference()` instead.	
// We do not want tsc to spend time either checking or inferring type of these huge expressions. Even when it does try to infer them they are still wrong.
// The actual type is an object with keys as entities names and values as TypeModel.

/** @type {any} */
export const typeModels = {
	"50": {
		"name": "BlobGetIn",
		"since": 1,
		"type": "DATA_TRANSFER_TYPE",
		"id": 50,
		"rootId": "B3N0b3JhZ2UAMg",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"51": {
				"final": false,
				"name": "_format",
				"id": 51,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			},
			"52": {
				"final": false,
				"name": "archiveId",
				"id": 52,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			},
			"110": {
				"final": false,
				"name": "blobId",
				"id": 110,
				"type": "GeneratedId",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			}
		},
		"associations": {
			"193": {
				"final": true,
				"name": "blobIds",
				"id": 193,
				"type": "AGGREGATION",
				"cardinality": "Any",
				"refTypeId": 144,
				"dependency": null
			}
		},
		"app": "storage",
		"version": "12"
	},
	"73": {
		"name": "BlobWriteData",
		"since": 1,
		"type": "AGGREGATED_TYPE",
		"id": 73,
		"rootId": "B3N0b3JhZ2UASQ",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"74": {
				"final": true,
				"name": "_id",
				"id": 74,
				"type": "CustomId",
				"cardinality": "One",
				"encrypted": false
			},
			"75": {
				"final": false,
				"name": "archiveOwnerGroup",
				"id": 75,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {},
		"app": "storage",
		"version": "12"
	},
	"77": {
		"name": "BlobAccessTokenPostIn",
		"since": 1,
		"type": "DATA_TRANSFER_TYPE",
		"id": 77,
		"rootId": "B3N0b3JhZ2UATQ",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"78": {
				"final": false,
				"name": "_format",
				"id": 78,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			},
			"180": {
				"final": false,
				"name": "archiveDataType",
				"id": 180,
				"type": "Number",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			}
		},
		"associations": {
			"80": {
				"final": false,
				"name": "write",
				"id": 80,
				"type": "AGGREGATION",
				"cardinality": "ZeroOrOne",
				"refTypeId": 73,
				"dependency": null
			},
			"181": {
				"final": true,
				"name": "read",
				"id": 181,
				"type": "AGGREGATION",
				"cardinality": "ZeroOrOne",
				"refTypeId": 175,
				"dependency": null
			}
		},
		"app": "storage",
		"version": "12"
	},
	"81": {
		"name": "BlobAccessTokenPostOut",
		"since": 1,
		"type": "DATA_TRANSFER_TYPE",
		"id": 81,
		"rootId": "B3N0b3JhZ2UAUQ",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"82": {
				"final": false,
				"name": "_format",
				"id": 82,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {
			"161": {
				"final": false,
				"name": "blobAccessInfo",
				"id": 161,
				"type": "AGGREGATION",
				"cardinality": "One",
				"refTypeId": 157,
				"dependency": null
			}
		},
		"app": "storage",
		"version": "12"
	},
	"94": {
		"name": "BlobReferencePutIn",
		"since": 1,
		"type": "DATA_TRANSFER_TYPE",
		"id": 94,
		"rootId": "B3N0b3JhZ2UAXg",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"95": {
				"final": false,
				"name": "_format",
				"id": 95,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			},
			"97": {
				"final": false,
				"name": "instanceListId",
				"id": 97,
				"type": "GeneratedId",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			},
			"107": {
				"final": false,
				"name": "instanceId",
				"id": 107,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			},
			"123": {
				"final": false,
				"name": "archiveDataType",
				"id": 123,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {
			"122": {
				"final": true,
				"name": "referenceTokens",
				"id": 122,
				"type": "AGGREGATION",
				"cardinality": "Any",
				"refTypeId": 1990,
				"dependency": "sys"
			}
		},
		"app": "storage",
		"version": "12"
	},
	"100": {
		"name": "BlobReferenceDeleteIn",
		"since": 1,
		"type": "DATA_TRANSFER_TYPE",
		"id": 100,
		"rootId": "B3N0b3JhZ2UAZA",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"101": {
				"final": false,
				"name": "_format",
				"id": 101,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			},
			"102": {
				"final": false,
				"name": "instanceListId",
				"id": 102,
				"type": "GeneratedId",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			},
			"103": {
				"final": false,
				"name": "instanceId",
				"id": 103,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			},
			"124": {
				"final": false,
				"name": "archiveDataType",
				"id": 124,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {
			"105": {
				"final": true,
				"name": "blobs",
				"id": 105,
				"type": "AGGREGATION",
				"cardinality": "Any",
				"refTypeId": 1882,
				"dependency": "sys"
			}
		},
		"app": "storage",
		"version": "12"
	},
	"125": {
		"name": "BlobPostOut",
		"since": 4,
		"type": "DATA_TRANSFER_TYPE",
		"id": 125,
		"rootId": "B3N0b3JhZ2UAfQ",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"126": {
				"final": false,
				"name": "_format",
				"id": 126,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			},
			"127": {
				"final": false,
				"name": "blobReferenceToken",
				"id": 127,
				"type": "String",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			}
		},
		"associations": {
			"208": {
				"final": true,
				"name": "blobReferenceTokens",
				"id": 208,
				"type": "AGGREGATION",
				"cardinality": "Any",
				"refTypeId": 1990,
				"dependency": "sys"
			}
		},
		"app": "storage",
		"version": "12"
	},
	"129": {
		"name": "BlobArchiveRef",
		"since": 4,
		"type": "LIST_ELEMENT_TYPE",
		"id": 129,
		"rootId": "B3N0b3JhZ2UAAIE",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"131": {
				"final": true,
				"name": "_id",
				"id": 131,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			},
			"132": {
				"final": true,
				"name": "_permissions",
				"id": 132,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			},
			"133": {
				"final": false,
				"name": "_format",
				"id": 133,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			},
			"134": {
				"final": true,
				"name": "_ownerGroup",
				"id": 134,
				"type": "GeneratedId",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			}
		},
		"associations": {
			"135": {
				"final": false,
				"name": "archive",
				"id": 135,
				"type": "ELEMENT_ASSOCIATION",
				"cardinality": "One",
				"refTypeId": 22,
				"dependency": null
			}
		},
		"app": "storage",
		"version": "12"
	},
	"144": {
		"name": "BlobId",
		"since": 4,
		"type": "AGGREGATED_TYPE",
		"id": 144,
		"rootId": "B3N0b3JhZ2UAAJA",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"145": {
				"final": true,
				"name": "_id",
				"id": 145,
				"type": "CustomId",
				"cardinality": "One",
				"encrypted": false
			},
			"146": {
				"final": false,
				"name": "blobId",
				"id": 146,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {},
		"app": "storage",
		"version": "12"
	},
	"154": {
		"name": "BlobServerUrl",
		"since": 4,
		"type": "AGGREGATED_TYPE",
		"id": 154,
		"rootId": "B3N0b3JhZ2UAAJo",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"155": {
				"final": true,
				"name": "_id",
				"id": 155,
				"type": "CustomId",
				"cardinality": "One",
				"encrypted": false
			},
			"156": {
				"final": false,
				"name": "url",
				"id": 156,
				"type": "String",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {},
		"app": "storage",
		"version": "12"
	},
	"157": {
		"name": "BlobServerAccessInfo",
		"since": 4,
		"type": "AGGREGATED_TYPE",
		"id": 157,
		"rootId": "B3N0b3JhZ2UAAJ0",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"158": {
				"final": true,
				"name": "_id",
				"id": 158,
				"type": "CustomId",
				"cardinality": "One",
				"encrypted": false
			},
			"159": {
				"final": false,
				"name": "blobAccessToken",
				"id": 159,
				"type": "String",
				"cardinality": "One",
				"encrypted": false
			},
			"192": {
				"final": false,
				"name": "expires",
				"id": 192,
				"type": "Date",
				"cardinality": "One",
				"encrypted": false
			},
			"209": {
				"final": false,
				"name": "tokenKind",
				"id": 209,
				"type": "Number",
				"cardinality": "One",
				"encrypted": false
			}
		},
		"associations": {
			"160": {
				"final": false,
				"name": "servers",
				"id": 160,
				"type": "AGGREGATION",
				"cardinality": "Any",
				"refTypeId": 154,
				"dependency": null
			}
		},
		"app": "storage",
		"version": "12"
	},
	"172": {
		"name": "InstanceId",
		"since": 4,
		"type": "AGGREGATED_TYPE",
		"id": 172,
		"rootId": "B3N0b3JhZ2UAAKw",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"173": {
				"final": true,
				"name": "_id",
				"id": 173,
				"type": "CustomId",
				"cardinality": "One",
				"encrypted": false
			},
			"174": {
				"final": true,
				"name": "instanceId",
				"id": 174,
				"type": "GeneratedId",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			}
		},
		"associations": {},
		"app": "storage",
		"version": "12"
	},
	"175": {
		"name": "BlobReadData",
		"since": 4,
		"type": "AGGREGATED_TYPE",
		"id": 175,
		"rootId": "B3N0b3JhZ2UAAK8",
		"versioned": false,
		"encrypted": false,
		"isPublic": true,
		"values": {
			"176": {
				"final": true,
				"name": "_id",
				"id": 176,
				"type": "CustomId",
				"cardinality": "One",
				"encrypted": false
			},
			"177": {
				"final": false,
				"name": "archiveId",
				"id": 177,
				"type": "GeneratedId",
				"cardinality": "One",
				"encrypted": false
			},
			"178": {
				"final": true,
				"name": "instanceListId",
				"id": 178,
				"type": "GeneratedId",
				"cardinality": "ZeroOrOne",
				"encrypted": false
			}
		},
		"associations": {
			"179": {
				"final": true,
				"name": "instanceIds",
				"id": 179,
				"type": "AGGREGATION",
				"cardinality": "Any",
				"refTypeId": 172,
				"dependency": null
			}
		},
		"app": "storage",
		"version": "12"
	}
}