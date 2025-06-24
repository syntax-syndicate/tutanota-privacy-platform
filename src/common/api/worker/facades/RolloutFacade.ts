import { assertWorkerOrNode } from "../../common/Env"
import { RolloutService } from "../../entities/sys/Services"
import { IServiceExecutor } from "../../common/ServiceRequest"
import { Rollout } from "../../entities/sys/TypeRefs"
import { RolloutType } from "../../common/TutanotaConstants"
import { defer, DeferredObject, remove } from "@tutao/tutanota-utils"

assertWorkerOrNode()

/**
 * Handles gradual rollout of features and/or migrations.
 */
export class RolloutFacade {
	private rollouts: Rollout[] = []
	private initialized: DeferredObject<void>

	constructor(private readonly serviceExecutor: IServiceExecutor) {
		this.initialized = defer<void>()
	}

	/**
	 * Asks the server what rollouts are scheduled for this user.
	 *
	 * Must be called before processing any rollouts
	 */
	public async initialize() {
		const rolloutGetOut = await this.serviceExecutor.get(RolloutService, null)
		this.rollouts = rolloutGetOut.rollouts
		this.initialized.resolve()
	}

	/**
	 * This can be called to execute a migration.
	 * It will only be executed if the user was selected for the rollout by the server.
	 * @param rolloutType the rolloutType the action corresponds to
	 * @param rolloutAction the migration to execute
	 * @returns RolloutResult that indicates whether it was executed, and the result, if it was.
	 */
	public async processRollout<T>(rolloutType: RolloutType, rolloutAction: () => Promise<T>): Promise<RolloutResult<T>> {
		const rollout = this.rollouts.filter((rollout) => rollout.rolloutType === rolloutType)
		if (rollout.length > 0) {
			await this.initialized.promise
			const result = await rolloutAction()
			remove(this.rollouts, rollout[0])
			return { executed: true, result }
		}
		return { executed: false }
	}
}

export type RolloutResult<T> = { executed: true; result: T } | { executed: false }
