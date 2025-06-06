/**
 * @file color/theme definitions for default themes.
 */
import { getCalendarLogoSvg, getMailLogoSvg, getTutaLogoSvg } from "./base/Logo"
import type { Theme, ThemeId } from "./theme"
import { assertMainOrNodeBoot, isApp } from "../api/common/Env"
import { client } from "../misc/ClientDetector.js"

assertMainOrNodeBoot()

// FIXME: Base color name
const PEACH = "#FFF2EA"
const DARK_PEACH = "#C9C6C5"
const RED_DUNKEL = "#410002"
const RED_FIGHTER = "#D93951"
const BLUE_DUNKEL = "#001641"
const BLUE_FIGHTER = "#0040FF"

// Secondary colors
export const secondary_fixed = "#FFDDB2"
export const on_secondary_fixed = "#291800"

/**
 * FIXME: logo related colors
 */
const red = "#850122"
const secondary_red = "#FF2222"
const dunkel = "#410002"
const blue = "#003E85"
const secondary_blue = "#4282FF"
const dark_lighter_0 = "#232323"
const logo_text_bright_grey = "#c5c7c7"
const black = "#000000"
export const logoDefaultGrey = "#c5c7c7"
export const tutaRed = red
export const tutaDunkel = dunkel

type Themes = Record<ThemeId, Theme>

const getLogo = (isDark: boolean, isDefault: boolean) => {
	const isDarkOrDefault = isDark || !isDefault
	if (!isApp()) {
		return isDarkOrDefault ? getTutaLogoSvg("#c4c4c4", "#c4c4c4") : getTutaLogoSvg(red, dunkel)
	}

	if (client.isCalendarApp()) {
		return isDarkOrDefault
			? getCalendarLogoSvg(logo_text_bright_grey, logo_text_bright_grey, logo_text_bright_grey)
			: getCalendarLogoSvg(blue, secondary_blue, black)
	}

	return isDarkOrDefault ? getMailLogoSvg(logo_text_bright_grey, logo_text_bright_grey, logo_text_bright_grey) : getMailLogoSvg(red, secondary_red, black)
}

/**
 * Color token definitions for each built-in theme.
 * We follow the color roles from Material 3 to define the names of the tokens,
 * the following link might be helpful to know which color token should be used in which situation.
 * https://m3.material.io/styles/color/roles
 *
 * When a new color role is needed, please follow the instructions below.
 * https://m3.material.io/styles/color/advanced/define-new-colors#baed14ce-4be8-46aa-8223-ace5d45af005
 */
export const themes = (): Themes => {
	const isCalendarApp = client.isCalendarApp()
	const lightRed = Object.freeze<Theme>({
		themeId: !isCalendarApp ? "light" : "light_secondary",
		logo: getLogo(false, !isCalendarApp),
		// Basic color tokens
		primary: "#8F4A4E",
		on_primary: "#FFFFFF",
		primary_container: "#FFDADA",
		on_primary_container: "#733337",
		secondary: "#A2752F",
		on_secondary: "#FFFFFF",
		secondary_container: "#FFDDB2",
		on_secondary_container: "#624000",
		tertiary: "#63568F",
		on_tertiary: "#FFFFFF",
		tertiary_container: "#E7DEFF",
		on_tertiary_container: "#4B3E76",
		error: "#BA1A1A",
		surface: "#FFFFFF",
		surface_dim: "#FBEBE1",
		on_surface: "#221A14",
		surface_container_low: "#FFF1E8",
		surface_container: "#fcf9f6",
		surface_container_high: "#f5eeea",
		surface_container_highest: "#EFE0D5",
		on_surface_variant: "#524343",
		outline: "#857373",
		outline_variant: "#D7C1C1",
		scrim: "#000000",
		experimental_primary_container: PEACH,
		experimental_on_primary_container: RED_DUNKEL,
		experimental_tertiary: RED_FIGHTER,
		// state colors; based on outline_variant, with alpha
		state_bg_hover: "#D7C1C144",
		state_bg_focus: "#D7C1C155",
		state_bg_active: "#D7C1C166",
		// Campaign colors
		tuta_color_nota: "#d93951",
		content_accent_tuta_bday: "#AC3E80",
		content_accent_secondary_tuta_bday: "#FCBFDE",
		content_bg_tuta_bday: "#222222",
	})
	const darkRed = Object.freeze<Theme>({
		themeId: !isCalendarApp ? "dark" : "dark_secondary",
		logo: getLogo(true, !isCalendarApp),
		// Basic color tokens
		primary: "#FFB3B5",
		on_primary: "#561D22",
		primary_container: "#733337",
		on_primary_container: "#FFDADA",
		secondary: "#F3BD6E",
		on_secondary: "#442B00",
		secondary_container: "#624000",
		on_secondary_container: "#FFDDB2",
		tertiary: "#CDBDFF",
		on_tertiary: "#34275E",
		tertiary_container: "#4B3E76",
		on_tertiary_container: "#E7DEFF",
		error: "#FFB4AB",
		surface: "#1a1111",
		surface_dim: "#000000",
		surface_container_low: "#221A14",
		surface_container: "#271d1d",
		surface_container_high: "#322828",
		surface_container_highest: "#3C332C",
		on_surface: "#f5ebeb",
		on_surface_variant: "#d7c1c1",
		outline: "#9F8C8C",
		outline_variant: "#524343",
		scrim: "#000000",
		experimental_primary_container: DARK_PEACH,
		experimental_on_primary_container: dark_lighter_0,
		experimental_tertiary: RED_FIGHTER,
		// state colors; based on outline_variant, with alpha
		state_bg_hover: "#52434377",
		state_bg_focus: "#52434399",
		state_bg_active: "#524343AA",
		// Campaign colors
		tuta_color_nota: "#d93951",
		content_accent_tuta_bday: "#FCBFDE",
		content_accent_secondary_tuta_bday: "#AC3E80",
		content_bg_tuta_bday: "#ffffff",
	})
	const lightBlue = Object.freeze<Theme>({
		themeId: isCalendarApp ? "light" : "light_secondary",
		logo: getLogo(false, isCalendarApp),
		// Basic color tokens
		primary: "#435E91",
		on_primary: "#FFFFFF",
		primary_container: "#D7E2FF",
		on_primary_container: "#2A4678",
		secondary: "#7F4D7B",
		on_secondary: "#FFFFFF",
		secondary_container: "#FFD6F7",
		on_secondary_container: "#643662",
		tertiary: "#006A65",
		on_tertiary: "#FFFFFF",
		tertiary_container: "#9DF2EA",
		on_tertiary_container: "#00504C",
		error: "#BA1A1A",
		surface: "#FFFFFF",
		surface_dim: "#f7f9ff",
		surface_container_low: "#F1F4F9",
		surface_container: "#f7f9fc",
		surface_container_high: "#ebeef5",
		surface_container_highest: "#E0E3E8",
		on_surface: "#221A14",
		on_surface_variant: "#44474E",
		outline: "#74777F",
		outline_variant: "#C4C6D0",
		scrim: "#000000",
		experimental_primary_container: PEACH,
		experimental_on_primary_container: BLUE_DUNKEL,
		experimental_tertiary: BLUE_FIGHTER,
		// state colors; based on outline_variant, with alpha
		state_bg_hover: "#C4C6D044",
		state_bg_focus: "#C4C6D055",
		state_bg_active: "#C4C6D066",
		// Campaign colors
		tuta_color_nota: "#d93951",
		content_accent_tuta_bday: "#AC3E80",
		content_accent_secondary_tuta_bday: "#FCBFDE",
		content_bg_tuta_bday: "#222222",
	})
	const darkBlue = Object.freeze<Theme>({
		themeId: isCalendarApp ? "dark" : "dark_secondary",
		logo: getLogo(true, isCalendarApp),
		// Basic color tokens
		primary: "#ACC7FF",
		on_primary: "#0E2F60",
		primary_container: "#2A4678",
		on_primary_container: "#D7E2FF",
		secondary: "#F0B3E8",
		on_secondary: "#4B1F4A",
		secondary_container: "#643662",
		on_secondary_container: "#FFD6F7",
		tertiary: "#81D5CE",
		on_tertiary: "#003734",
		tertiary_container: "#00504C",
		on_tertiary_container: "#9DF2EA",
		error: "#FFB4AB",
		surface: "#101418",
		surface_dim: "#000000",
		surface_container_low: "#181C20",
		surface_container: "#1c2024",
		surface_container_high: "#272a2f",
		surface_container_highest: "#313539",
		on_surface: "#e0e2e8",
		on_surface_variant: "#c4c6d0",
		outline: "#8e9099",
		outline_variant: "#44474E",
		scrim: "#000000",
		experimental_primary_container: DARK_PEACH,
		experimental_on_primary_container: dark_lighter_0,
		experimental_tertiary: BLUE_FIGHTER,
		// state colors; based on outline_variant, with alpha
		state_bg_hover: "#44474E77",
		state_bg_focus: "#44474E99",
		state_bg_active: "#44474EAA",
		// Campaign colors
		tuta_color_nota: "#d93951",
		content_accent_tuta_bday: "#FCBFDE",
		content_accent_secondary_tuta_bday: "#AC3E80",
		content_bg_tuta_bday: "#ffffff",
	})

	return {
		light: isCalendarApp ? lightBlue : lightRed,
		dark: isCalendarApp ? darkBlue : darkRed,
		light_secondary: isCalendarApp ? lightRed : lightBlue,
		dark_secondary: isCalendarApp ? darkRed : darkBlue,
	}
}
