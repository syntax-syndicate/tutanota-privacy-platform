import { createPublicKeyGetIn } from "../../entities/sys/TypeRefs.js"
import { IServiceExecutor } from "../../common/ServiceRequest.js"
import { PublicKeyService } from "../../entities/sys/Services.js"
import { Versioned } from "@tutao/tutanota-utils"
import { PublicKeyIdentifierType } from "../../common/TutanotaConstants.js"
import { KeyVersion } from "@tutao/tutanota-utils/dist/Utils.js"
import { InvalidDataError } from "../../common/error/RestError.js"
import { CryptoError } from "@tutao/tutanota-crypto/error.js"
import { PublicKeyConverter } from "../crypto/PublicKeyConverter"
import { AsymmetricPublicKey, isVersionedRsaOrRsaEccPublicKey } from "@tutao/tutanota-crypto"

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
		// TODO: Do we want to keep this method at all?
		return await this.loadPubKey(pubKeyIdentifier, version)
	}

	private async loadPubKey(pubKeyIdentifier: PublicKeyIdentifier, version: KeyVersion | null): Promise<Versioned<AsymmetricPublicKey>> {
		const requestData = createPublicKeyGetIn({
			version: version ? String(version) : null,
			identifier: pubKeyIdentifier.identifier,
			identifierType: pubKeyIdentifier.identifierType,
		})
		const publicKeyGetOut = await this.serviceExecutor.get(PublicKeyService, requestData)

		// TODO: Merge PublicKeyProvider with PublicKeyConverter
		const publicKey = new PublicKeyConverter().convertFromPublicKeyGetOut(publicKeyGetOut)

		this.enforceRsaKeyVersionConstraint(publicKey)
		if (version != null && publicKey.version !== version) {
			throw new InvalidDataError("the server returned a key version that was not requested")
		}
		return publicKey
	}

	/**
	 * RSA keys were only created before introducing key versions, i.e. they always have version 0.
	 *
	 * Receiving a higher version would indicate a protocol downgrade/ MITM attack, and we reject such keys.
	 */
	private enforceRsaKeyVersionConstraint(publicKey: Versioned<AsymmetricPublicKey>) {
		// TODO: Is this the right function or do we want isVersionedRsaKeyPair()?
		if (isVersionedRsaOrRsaEccPublicKey(publicKey) && publicKey.version !== 0) {
			throw new CryptoError("rsa key in a version that is not 0")
		}
	}
}
