// read from the offline db according to the list and element id on the entityUpdate
// decrypt encrypted fields using the OwnerEncSessionKey on the entry from the offline db
// apply patch operations using a similar logic from the server
// update the instance in the offline db

import {
	EncryptedParsedAssociation,
	EncryptedParsedValue,
	Entity,
	ModelValue,
	ParsedAssociation,
	ParsedInstance,
	ParsedValue,
	ServerModelEncryptedParsedInstance,
	ServerModelParsedInstance,
	ServerModelUntypedInstance,
	ServerTypeModel,
} from "../../common/EntityTypes"
import { Patch } from "../../entities/sys/TypeRefs"
import { assertNotNull, Base64, promiseMap, TypeRef } from "@tutao/tutanota-utils"
import { AttributeModel } from "../../common/AttributeModel"
import { CacheStorage } from "../rest/DefaultEntityRestCache"
import { Nullable } from "@tutao/tutanota-utils/dist/Utils"
import { PatchOperationError } from "../../common/error/PatchOperationError"
import { AssociationType, Cardinality } from "../../common/EntityConstants"
import { PatchOperationType, ServerTypeModelResolver } from "../../common/EntityFunctions"
import { InstancePipeline } from "../crypto/InstancePipeline"
import { isSameId } from "../../common/utils/EntityUtils"
import { convertDbToJsType } from "../crypto/ModelMapper"
import { decryptValue } from "../crypto/CryptoMapper"
import { VersionedEncryptedKey } from "../crypto/CryptoWrapper"
import { AesKey } from "@tutao/tutanota-crypto"
import { CryptoFacade } from "../crypto/CryptoFacade"
import { parseKeyVersion } from "../facades/KeyLoaderFacade"

export class PatchMerger {
	constructor(
		private readonly cacheStorage: CacheStorage,
		private readonly instancePipeline: InstancePipeline,
		private readonly serverTypeResolver: ServerTypeModelResolver,
		private readonly cryptoFacade: CryptoFacade,
	) {}

	public async getPatchedInstance<T extends Entity>(
		instanceType: TypeRef<T>,
		listId: Nullable<Id>,
		elementId: Id,
		patches: Array<Patch>,
	): Promise<Nullable<T>> {
		const instanceParsed = await this.getPatchedInstanceParsed(instanceType, listId, elementId, patches)
		if (instanceParsed != null) {
			return await this.instancePipeline.modelMapper.mapToInstance<T>(instanceType, instanceParsed)
		}
		return null
	}

	public async getPatchedInstanceParsed(
		instanceType: TypeRef<Entity>,
		listId: Nullable<Id>,
		elementId: Id,
		patches: Array<Patch>,
	): Promise<ServerModelParsedInstance | null> {
		const parsedInstance = await this.cacheStorage.getParsed(instanceType, listId, elementId)
		if (parsedInstance != null) {
			const typeModel = await this.serverTypeResolver.resolveServerTypeReference(instanceType)
			await promiseMap(patches, async (patch) => this.applySinglePatch(parsedInstance, typeModel, patch))
			return parsedInstance
		}
		return null
	}

	public async storePatchedInstance(instanceType: TypeRef<Entity>, listId: Nullable<Id>, elementId: Id, patches: Array<Patch>): Promise<void> {
		const patchAppliedInstance = await this.getPatchedInstanceParsed(instanceType, listId, elementId, patches)
		if (patchAppliedInstance == null) {
			return
		}
		await this.cacheStorage.put(instanceType, patchAppliedInstance)
	}

	private async applySinglePatch(parsedInstance: ServerModelParsedInstance, typeModel: ServerTypeModel, patch: Patch) {
		try {
			const pathList: Array<string> = patch.attributePath.split("/")
			const pathResult: PathResult = await this.traversePath(parsedInstance, typeModel, pathList)
			const attributeId = pathResult.attributeId
			const pathResultTypeModel = pathResult.typeModel
			// We need to map and decrypt for REPLACE and ADDITEM as the payloads are encrypted, REMOVEITEM only has either aggregate ids, generated ids, or id tuples
			if (patch.patchOperation !== PatchOperationType.REMOVE_ITEM) {
				const encryptedParsedValue: Nullable<EncryptedParsedValue | EncryptedParsedAssociation> = await this.parseValueOnPatch(pathResult, patch.value)
				const isAttributeEncrypted =
					pathResultTypeModel.values[attributeId]?.encrypted || pathResultTypeModel.associations[attributeId]?.type === AssociationType.Aggregation
				let value: Nullable<ParsedValue | ParsedAssociation>
				if (isAttributeEncrypted) {
					const sk = await this.getSessionKey(parsedInstance, typeModel)
					value = await this.decryptValueOnPatchIfNeeded(pathResult, encryptedParsedValue, sk)
				} else {
					value = await this.decryptValueOnPatchIfNeeded(pathResult, encryptedParsedValue, null)
				}
				await this.applyPatchOperation(patch.patchOperation, pathResult, value)
			} else {
				let idArray = JSON.parse(patch.value!) as Array<any>
				await this.applyPatchOperation(patch.patchOperation, pathResult, idArray)
			}
		} catch (e) {
			throw new PatchOperationError(e)
		}
	}

	private async getSessionKey(parsedInstance: ServerModelParsedInstance, typeModel: ServerTypeModel) {
		const _ownerEncSessionKey = AttributeModel.getAttribute<Uint8Array>(parsedInstance, "_ownerEncSessionKey", typeModel)
		const _ownerKeyVersion = parseKeyVersion(AttributeModel.getAttribute<string>(parsedInstance, "_ownerKeyVersion", typeModel))
		const _ownerGroup = AttributeModel.getAttribute<Id>(parsedInstance, "_ownerGroup", typeModel)
		const versionedEncryptedKey = {
			encryptingKeyVersion: _ownerKeyVersion,
			key: _ownerEncSessionKey,
		} as VersionedEncryptedKey
		const sk = await this.cryptoFacade.decryptSessionKey(_ownerGroup, versionedEncryptedKey)
		return sk
	}

	private async applyPatchOperation(
		patchOperation: Values<PatchOperationType>,
		pathResult: PathResult,
		value: Nullable<ParsedValue | ParsedAssociation> | Array<Id | IdTuple>,
	) {
		const { attributeId, instanceToChange, typeModel } = pathResult
		const isValue = typeModel.values[attributeId] !== undefined
		const isAssociation = typeModel.associations[attributeId] !== undefined
		const isNonAggregationAssociation = isAssociation && typeModel.associations[attributeId].type !== AssociationType.Aggregation
		switch (patchOperation) {
			case PatchOperationType.ADD_ITEM: {
				if (isValue) {
					throw new PatchOperationError(
						"AddItem operation is supported for associations only, but the operation was called on value with id " + attributeId,
					)
				}
				let associationArray = instanceToChange[attributeId] as ParsedAssociation
				const valuesToAdd = value as ParsedAssociation
				const newAssociationValue = associationArray.concat(valuesToAdd)
				instanceToChange[attributeId] = newAssociationValue
				this.assertCorrectAssociationCardinality(pathResult, newAssociationValue)
				break
			}
			case PatchOperationType.REMOVE_ITEM: {
				if (isValue) {
					throw new PatchOperationError(
						"AddItem operation is supported for associations only, but the operation was called on value with id " + attributeId,
					)
				}
				if (isNonAggregationAssociation) {
					const associationArray = instanceToChange[attributeId] as Array<Id | IdTuple>
					const idsToRemove = value as Array<Id | IdTuple>
					const remainingAssociations = associationArray.filter(
						(element) =>
							!idsToRemove.some((item) => {
								return isSameId(element, item) // use is same id on the ids instead
							}),
					)
					instanceToChange[attributeId] = remainingAssociations
					this.assertCorrectAssociationCardinality(pathResult, remainingAssociations)
				} else {
					const modelAssociation = typeModel.associations[attributeId]
					const appName = modelAssociation.dependency ?? typeModel.app
					const aggregationTypeModel = await this.serverTypeResolver.resolveServerTypeReference(new TypeRef(appName, modelAssociation.refTypeId))
					const aggregationArray = instanceToChange[attributeId] as Array<ParsedInstance>
					const idsToRemove = value as Array<Id>
					const remainingAggregations = aggregationArray.filter(
						(element) =>
							!idsToRemove.some((item) => {
								const aggregateIdAttributeId = assertNotNull(AttributeModel.getAttributeId(aggregationTypeModel, "_id"))
								return isSameId(item as Id, element[aggregateIdAttributeId] as Id)
							}),
					)
					instanceToChange[attributeId] = remainingAggregations
					this.assertCorrectAssociationCardinality(pathResult, remainingAggregations)
				}
				break
			}
			case PatchOperationType.REPLACE: {
				if (isValue) {
					instanceToChange[attributeId] = value as ParsedValue
					this.assertCorrectValueCardinality(pathResult, value as ParsedValue)
				} else if (isNonAggregationAssociation) {
					instanceToChange[attributeId] = value as ParsedAssociation
					this.assertCorrectAssociationCardinality(pathResult, value as ParsedAssociation)
				} else {
					throw new PatchOperationError("attempted to replace aggregation " + typeModel.associations[attributeId].name + " on " + typeModel.name)
				}
				break
			}
		}
	}

	private async parseValueOnPatch(
		pathResult: PathResult,
		value: string | null,
	): Promise<Nullable<EncryptedParsedValue> | Nullable<EncryptedParsedAssociation>> {
		const { typeModel, attributeId } = pathResult
		const isValue = typeModel.values[attributeId] !== undefined
		const isAssociation = typeModel.associations[attributeId] !== undefined
		const isAggregation = isAssociation && typeModel.associations[attributeId].type === AssociationType.Aggregation
		const isNonAggregateAssociation = isAssociation && !isAggregation
		if (isValue) {
			const valueType = typeModel.values[attributeId].type
			return convertDbToJsType(valueType, value)
		} else if (isAssociation) {
			if (isNonAggregateAssociation) {
				return JSON.parse(value!)
			} else {
				const aggregatedEntities = JSON.parse(value!) as Array<ServerModelUntypedInstance>
				aggregatedEntities.map(AttributeModel.removeNetworkDebuggingInfoIfNeeded)
				const modelAssociation = typeModel.associations[attributeId]
				const appName = modelAssociation.dependency ?? typeModel.app
				const aggregationTypeModel = await this.serverTypeResolver.resolveServerTypeReference(new TypeRef(appName, modelAssociation.refTypeId))
				return await promiseMap(aggregatedEntities, async (entity) => await this.instancePipeline.typeMapper.applyJsTypes(aggregationTypeModel, entity))
			}
		}

		return null
	}

	private async decryptValueOnPatchIfNeeded(
		pathResult: PathResult,
		value: Nullable<EncryptedParsedValue | EncryptedParsedAssociation>,
		sk: Nullable<AesKey>,
	): Promise<Nullable<ParsedValue> | Nullable<ParsedAssociation>> {
		const { typeModel, attributeId } = pathResult
		const isValue = typeModel.values[attributeId] !== undefined
		const isAggregation = typeModel.associations[attributeId] !== undefined && typeModel.associations[attributeId].type === AssociationType.Aggregation
		if (isValue) {
			if (sk !== null) {
				const encryptedValueInfo = typeModel.values[attributeId] as ModelValue & { encrypted: true }
				return decryptValue(encryptedValueInfo, value as Base64, sk)
			}
			return value
		} else if (isAggregation) {
			const encryptedAggregatedEntities = value as Array<ServerModelEncryptedParsedInstance>
			const modelAssociation = typeModel.associations[attributeId]
			const appName = modelAssociation.dependency ?? typeModel.app
			const aggregationTypeModel = await this.serverTypeResolver.resolveServerTypeReference(new TypeRef(appName, modelAssociation.refTypeId))
			return await this.instancePipeline.cryptoMapper.decryptAggregateAssociation(aggregationTypeModel, encryptedAggregatedEntities, sk)
		}

		return value // id and idTuple associations are never encrypted
	}

	private async traversePath(parsedInstance: ServerModelParsedInstance, serverTypeModel: ServerTypeModel, path: Array<string>): Promise<PathResult> {
		if (path.length == 0) {
			throw new PatchOperationError("Invalid attributePath, expected non-empty attributePath")
		}
		const pathItem = path.shift()!
		try {
			let attributeId: number
			if (env.networkDebugging) {
				attributeId = parseInt(pathItem.split(":")[0])
			} else {
				attributeId = parseInt(pathItem)
			}
			if (!Object.keys(parsedInstance).some((attribute) => attribute == attributeId.toString())) {
				throw new PatchOperationError("attribute id " + attributeId + " not found on the parsed instance. Type: " + serverTypeModel.name)
			}

			if (path.length == 0) {
				return {
					attributeId: attributeId,
					instanceToChange: parsedInstance,
					typeModel: serverTypeModel,
				} as PathResult
			}

			const isAggregation = serverTypeModel.associations[attributeId].type === AssociationType.Aggregation
			if (!isAggregation) {
				throw new PatchOperationError("Expected the attribute id " + attributeId + " to be an aggregate on the type: " + serverTypeModel.name)
			}

			const modelAssociation = serverTypeModel.associations[attributeId]
			const appName = modelAssociation.dependency ?? serverTypeModel.app
			const aggregationTypeModel = await this.serverTypeResolver.resolveServerTypeReference(new TypeRef(appName, modelAssociation.refTypeId))

			const maybeAggregateIdPathItem = path.shift()!
			const aggregateArray = parsedInstance[attributeId] as Array<ServerModelParsedInstance>
			const aggregatedEntity = assertNotNull(
				aggregateArray.find((entity) => {
					const aggregateIdAttributeId = assertNotNull(AttributeModel.getAttributeId(aggregationTypeModel, "_id"))
					return isSameId(maybeAggregateIdPathItem, entity[aggregateIdAttributeId] as Id)
				}),
			)
			return this.traversePath(aggregatedEntity, aggregationTypeModel, path)
		} catch (e) {
			throw new PatchOperationError("An error occurred while traversing path " + path + e.message)
		}
	}

	private assertCorrectAssociationCardinality(pathResult: PathResult, valuesToAdd: ParsedAssociation): void {
		const modelAssociation = pathResult.typeModel.associations[pathResult.attributeId]!
		const cardinality = modelAssociation.cardinality
		if ((cardinality == Cardinality.ZeroOrOne && valuesToAdd.length > 1) || (cardinality == Cardinality.One && valuesToAdd.length != 1)) {
			throw new PatchOperationError(
				`invalid value / cardinality combination for value ${pathResult.attributeId} on association ${modelAssociation.name}: ${cardinality}, val.len: ${valuesToAdd.length}`,
			)
		}
	}

	private assertCorrectValueCardinality(pathResult: PathResult, valueToAdd: Nullable<ParsedValue>): void {
		const modelValue = pathResult.typeModel.values[pathResult.attributeId]
		const cardinality = modelValue.cardinality
		if (cardinality == Cardinality.One && valueToAdd === null) {
			throw new PatchOperationError(
				`invalid value / cardinality combination for value ${pathResult.attributeId} on value ${modelValue.name}: ${cardinality}, isNull: ${true}`,
			)
		}
	}
}

export type PathResult = {
	instanceToChange: ServerModelParsedInstance
	attributeId: number
	typeModel: ServerTypeModel
}
