import { fetch, RequestInfo, RequestInit, Response } from "undici"
import { ServiceUnavailableError, TooManyRequestsError } from "../../api/common/error/RestError.js"
import { filterInt } from "@tutao/tutanota-utils"
import { log } from "../DesktopLog.js"
import { customFetch } from "./NetAgent"

import { newPromise } from "@tutao/tutanota-utils/dist/Utils"

const TAG = "[suspending-fetch]"

export async function suspensionAwareFetch(input: string | URL, init?: RequestInit): Promise<Response> {
	const res = await customFetch(input, init)
	if ((res.status === ServiceUnavailableError.CODE || TooManyRequestsError.CODE) && (res.headers.get("retry-after") || res.headers.get("suspension-time"))) {
		// headers are lowercased, see https://nodejs.org/api/http.html#http_message_headers
		const time = filterInt((res.headers.get("retry-after") ?? res.headers.get("suspension-time")) as string)
		log.debug(TAG, `ServiceUnavailable when downloading missed notification, waiting ${time}s`)

		return newPromise((resolve, reject) => {
			setTimeout(() => suspensionAwareFetch(input, init).then(resolve, reject), time * 1000)
		})
	} else {
		return res
	}
}
