export type dropHandler = (dragData: string) => void
// not all browsers have the actual button as e.currentTarget, but all of them send it as a second argument (see https://github.com/tutao/tutanota/issues/1110)
export type ClickHandler = (event: MouseEvent, dom: HTMLElement) => void

// See: https://webaim.org/techniques/keyboard/tabindex#overview
export enum TabIndex {
	Programmatic = "-1",
	// focus on element can only be set programmatically
	Default = "0", // regular tab order
}
