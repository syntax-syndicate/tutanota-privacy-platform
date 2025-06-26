import { assertWorkerOrNode } from "../../common/Env"
import { RolloutService } from "../../entities/sys/Services"
import { IServiceExecutor } from "../../common/ServiceRequest"
import { Rollout } from "../../entities/sys/TypeRefs"
import { RolloutType } from "../../common/TutanotaConstants"
import { LazyLoaded } from "@tutao/tutanota-utils"

assertWorkerOrNode()

export interface RolloutAction {
	execute(): Promise<void>
}

/**
 * Handles gradual rollout of features and/or migrations.
 */
export class RolloutFacade {
	private rollouts: LazyLoaded<Array<Rollout>>
	private rolloutActions: Map<RolloutType, RolloutAction>

	constructor(private readonly serviceExecutor: IServiceExecutor, private readonly sendError: (error: Error) => Promise<void>) {
		this.rollouts = new LazyLoaded(async () => {
			const result = await this.serviceExecutor.get(RolloutService, null)
			return result.rollouts
		})
		this.rolloutActions = new Map()
	}

	/**
	 * Asks the server what rollouts are scheduled for this user.
	 *
	 * Must be called before processing any rollouts
	 */
	public async initialize() {
		return this.rollouts.getAsync()
	}

	public configureRollout(rolloutType: RolloutType, rolloutAction: RolloutAction) {
		this.rolloutActions.set(rolloutType, rolloutAction)
	}

	/**
	 * This can be called to execute a migration.
	 * It will only be executed if the user was selected for the rollout by the server.
	 * @param rolloutType the rolloutType the action corresponds to
	 * @param rolloutAction the migration to execute
	 * @returns RolloutResult that indicates whether it was executed, and the result, if it was.
	 */
	public async processRollout<T>(rolloutType: RolloutType): Promise<RolloutResult<T>> {
		const rollout = this.rolloutActions.get(rolloutType)
		if (rollout) {
			try {
				const result = await rollout.execute()
			} catch (e) {
				console.log(`error executing rollout action`, rolloutType)
				//@ts-ignore We report the error to the user interface but do not block further execution.
				this.sendError(e)
			}
			this.rolloutActions.delete(rolloutType)
			return { executed: true }
		}
		return { executed: false }
	}
}

export type RolloutResult<T> = { executed: true } | { executed: false }
