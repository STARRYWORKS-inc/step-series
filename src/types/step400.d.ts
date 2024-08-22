import { MotorBaseObj } from "./stepSeries";

// -------------------------------------------------------------------------------------------
// モータドライバの設定
// https://ponoor.com/docs/step-series/osc-command-reference/motordriver-settings/
//
export interface AdcValObj extends MotorBaseObj {
	ADC_OUT: number | number[]; // 0 - 31	ADC_OUT register value
}

// -------------------------------------------------------------------------------------------
// アラーム
// https://ponoor.com/docs/step-series/osc-command-reference/alarm-settings/
// -------------------------------------------------------------------------------------------
export interface ProhibitMotionOnLimitSwObj extends MotorBaseObj {
	enable: (0 | 1) | (0 | 1)[]; // 1:禁止, 0:許可
}

// -------------------------------------------------------------------------------------------
// 電圧モード、電流モードの設定
// https://ponoor.com/docs/step-series/osc-command-reference/voltage-and-current-mode-settings/
//
export interface TvalObj extends MotorBaseObj {
	holdTVAL: number | number[]; //0-127	停止時のTVAL
	runTVAL: number | number[]; //0-127	一定速運転時のTVAL
	accTVAL: number | number[]; //0-127	加速時のTVAL
	decTVAL: number | number[]; //0-127	減速時のTVAL
}

export interface Tval_mAObj extends MotorBaseObj {
	holdTVAL_mA: number | number[]; // 78.125 - 5000.0	停止時のTVAL [mA]
	runTVAL_mA: number | number[]; // 78.125 - 5000.0	一定速運転時のTVAL [mA]
	accTVAL_mA: number | number[]; // 78.125 - 5000.0	加速時のTVAL [mA]
	decTVAL_mA: number | number[]; // 78.125 - 5000.0	減速時のTVAL [mA]
}

export interface DecayModeParamObj extends MotorBaseObj {
	T_FAST: number | number[]; //0-255(0xFF)	T_FASTレジスタの値
	TON_MIN: number | number[]; //0-255(0xFF)	TON_MINレジスタの値
	TOFF_MIN: number | number[]; //0-255(0xFF)	TOFF_MINレジスタの値
}

// -------------------------------------------------------------------------------------------
// HOME/LIMITセンサ
// https://ponoor.com/docs/step-series/osc-command-reference/home-limit-sensors/
// -------------------------------------------------------------------------------------------
export interface LimitSwObj extends MotorBaseObj {
	swState: (0 | 1) | (0 | 1)[]; // 状態
	direction: (0 | 1) | (0 | 1)[]; // 方向
}

export interface LimitSwModeObj extends MotorBaseObj {
	swMode: (0 | 1) | (0 | 1)[];
}
