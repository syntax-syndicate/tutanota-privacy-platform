public typealias Base64 = String

/// Alarm notification as received from the server. Also peristed.
/// Contains both signaling about the event (operation) and the payload itself
public struct EncryptedAlarmNotification: Codable {
	public let operation: Operation
	public let summary: Base64
	public let eventStart: Base64
	public let eventEnd: Base64
	private let alarmInfo: [EncryptedAlarmInfo]
	private let repeatRule: [EncryptedRepeatRule]
	public let notificationSessionKeys: [NotificationSessionKey]
	private let user: [Base64]

	public init(
		operation: Operation,
		summary: Base64,
		eventStart: Base64,
		eventEnd: Base64,
		alarmInfo: EncryptedAlarmInfo,
		repeatRule: EncryptedRepeatRule?,
		notificationSessionKeys: [NotificationSessionKey],
		user: Base64
	) {
		self.operation = operation
		self.summary = summary
		self.eventStart = eventStart
		self.eventEnd = eventEnd
		self.alarmInfo = [alarmInfo]
		self.repeatRule = repeatRule != nil ? [repeatRule!] : []
		self.notificationSessionKeys = notificationSessionKeys
		self.user = [user]
	}

	enum CodingKeys: String, CodingKey {
		case operation = "1566"
		case summary = "1567"
		case eventStart = "1568"
		case eventEnd = "1569"
		case alarmInfo = "1570"
		case repeatRule = "1571"
		case notificationSessionKeys = "1572"
		case user = "1573"
	}
	func getAlarmInfo() -> EncryptedAlarmInfo { self.alarmInfo.first! }
	func getRepeatRule() -> EncryptedRepeatRule? { self.repeatRule.first }
	func getUser() -> Base64 { self.user.first! }
}

extension EncryptedAlarmNotification: Equatable {
	public static func == (lhs: EncryptedAlarmNotification, rhs: EncryptedAlarmNotification) -> Bool {
		lhs.getAlarmInfo().alarmIdentifier == rhs.getAlarmInfo().alarmIdentifier
	}
}

extension EncryptedAlarmNotification: Hashable { public func hash(into hasher: inout Hasher) { self.getAlarmInfo().alarmIdentifier.hash(into: &hasher) } }
