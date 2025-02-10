import { createPublicKeyGetIn, PublicKeyGetOut } from "../../entities/sys/TypeRefs.js"
import { IServiceExecutor } from "../../common/ServiceRequest.js"
import { PublicKeyService } from "../../entities/sys/Services.js"
import { parseKeyVersion } from "./KeyLoaderFacade.js"
import { Versioned } from "@tutao/tutanota-utils"
import { PublicKeyIdentifierType } from "../../common/TutanotaConstants.js"
import { KeyVersion } from "@tutao/tutanota-utils/dist/Utils.js"
import { InvalidDataError } from "../../common/error/RestError.js"
import { CryptoError } from "@tutao/tutanota-crypto/error.js"
import { AsymmetricPublicKey } from "../../../../../packages/tutanota-crypto/lib/index.js"

export type PublicKeyIdentifier = {
	identifier: string
	identifierType: PublicKeyIdentifierType
}

/**
 * Load public keys.
 * Handle key versioning.
 */
export class PublicKeyProvider {
	constructor(private readonly serviceExecutor: IServiceExecutor) {}

	async loadCurrentPubKey(pubKeyIdentifier: PublicKeyIdentifier): Promise<Versioned<AsymmetricPublicKey>> {
		return this.loadPubKey(pubKeyIdentifier, null)
	}

	async loadVersionedPubKey(pubKeyIdentifier: PublicKeyIdentifier, version: KeyVersion): Promise<Versioned<AsymmetricPublicKey>> {
		return await this.loadPubKey(pubKeyIdentifier, version)
	}

	private async loadPubKey(pubKeyIdentifier: PublicKeyIdentifier, version: KeyVersion | null): Promise<Versioned<AsymmetricPublicKey>> {
		const requestData = createPublicKeyGetIn({
			version: version ? String(version) : null,
			identifier: pubKeyIdentifier.identifier,
			identifierType: pubKeyIdentifier.identifierType,
		})
		const publicKeyGetOut = await this.serviceExecutor.get(PublicKeyService, requestData)
		const pubKeys = this.convertToVersionedPublicKeys(publicKeyGetOut)
		this.enforceRsaKeyVersionConstraint(pubKeys)
		if (version != null && pubKeys.version !== version) {
			throw new InvalidDataError("the server returned a key version that was not requested")
		}
		return pubKeys
	}

	/**
	 * RSA keys were only created before introducing key versions, i.e. they always have version 0.
	 *
	 * Receiving a higher version would indicate a protocol downgrade/ MITM attack, and we reject such keys.
	 */
	private enforceRsaKeyVersionConstraint(pubKeys: Versioned<PublicKeys>) {
		if (pubKeys.version !== 0 && pubKeys.object.pubRsaKey != null) {
			throw new CryptoError("rsa key in a version that is not 0")
		}
	}

	private convertToVersionedPublicKeys(publicKeyGetOut: PublicKeyGetOut): Versioned<AsymmetricPublicKey> {
		return {
			object: {
				pubRsaKey: publicKeyGetOut.pubRsaKey,
				pubKyberKey: publicKeyGetOut.pubKyberKey,
				pubEccKey: publicKeyGetOut.pubEccKey,
			},
			version: parseKeyVersion(publicKeyGetOut.pubKeyVersion),
		}
	}
}
