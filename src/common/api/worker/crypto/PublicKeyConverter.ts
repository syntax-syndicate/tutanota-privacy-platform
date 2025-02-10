import type { PubDistributionKey, PublicKeyGetOut, SystemKeysReturn } from "../../entities/sys/TypeRefs"
import { uint8ArrayToHex, Versioned } from "@tutao/tutanota-utils"
import { AsymmetricPublicKey, bytesToKyberPublicKey, hexToRsaPublicKey, KeyPairType, PQPublicKeys, RsaEccPublicKey } from "@tutao/tutanota-crypto"
import { parseKeyVersion } from "../facades/KeyLoaderFacade"

type PublicKeyRawData = {
	pubKeyVersion: NumberString
	pubEccKey: null | Uint8Array
	pubKyberKey: null | Uint8Array
	pubRsaKey: null | Uint8Array
}

export class PublicKeyConverter {
	public convertFromPublicKeyGetOut(publicKeys: PublicKeyGetOut): Versioned<AsymmetricPublicKey> {
		return this.convertFromPublicKeyRawData({
			pubRsaKey: publicKeys.pubRsaKey,
			pubEccKey: publicKeys.pubEccKey,
			pubKyberKey: publicKeys.pubKyberKey,
			pubKeyVersion: publicKeys.pubKeyVersion,
		})
	}

	public convertFromSystemKeysReturn(publicKeys: SystemKeysReturn): Versioned<AsymmetricPublicKey> {
		return this.convertFromPublicKeyRawData({
			pubRsaKey: publicKeys.systemAdminPubRsaKey,
			pubEccKey: publicKeys.systemAdminPubEccKey,
			pubKyberKey: publicKeys.systemAdminPubKyberKey,
			pubKeyVersion: publicKeys.systemAdminPubKeyVersion,
		})
	}

	public convertFromPubDistributionKey(distributionKey: PubDistributionKey, keyVersion: string) {
		return this.convertFromPublicKeyRawData({
			pubRsaKey: null,
			pubEccKey: distributionKey.pubEccKey,
			pubKyberKey: distributionKey.pubKyberKey,
			pubKeyVersion: keyVersion,
		})
	}

	private convertFromPublicKeyRawData(publicKeys: PublicKeyRawData): Versioned<AsymmetricPublicKey> {
		const version = parseKeyVersion(publicKeys.pubKeyVersion)
		if (publicKeys.pubRsaKey) {
			if (publicKeys.pubEccKey) {
				const eccPublicKey = publicKeys.pubEccKey
				const rsaPublicKey = hexToRsaPublicKey(uint8ArrayToHex(publicKeys.pubRsaKey))
				const rsaEccPublicKey: RsaEccPublicKey = Object.assign(rsaPublicKey, { keyPairType: KeyPairType.RSA_AND_ECC, publicEccKey: eccPublicKey })
				return {
					version,
					object: rsaEccPublicKey,
				}
			} else {
				return {
					version,
					object: hexToRsaPublicKey(uint8ArrayToHex(publicKeys.pubRsaKey)),
				}
			}
		} else if (publicKeys.pubKyberKey && publicKeys.pubEccKey) {
			const eccPublicKey = publicKeys.pubEccKey
			const kyberPublicKey = bytesToKyberPublicKey(publicKeys.pubKyberKey)
			const pqPublicKey: PQPublicKeys = {
				keyPairType: KeyPairType.TUTA_CRYPT,
				eccPublicKey,
				kyberPublicKey,
			}
			return {
				version,
				object: pqPublicKey,
			}
		} else {
			throw new Error("Inconsistent public key")
		}
	}
}
