import Foundation

/// A key that encrypt the fields for a given notification
public struct NotificationSessionKey: Codable {
	private let pushIdentifier: [IdTuple]
	public let pushIdentifierSessionEncSessionKey: String

	enum CodingKeys: String, CodingKey {
		case pushIdentifier = "1555"
		case pushIdentifierSessionEncSessionKey = "1556"
	}
	func getPushIdentifier() -> IdTuple { self.pushIdentifier.first! }
}
