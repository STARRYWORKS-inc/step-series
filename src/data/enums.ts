import {
	OverCurrentDetectionThreshold_Step400,
	OverCurrentDetectionThreshold_Step800,
} from "./enum/overCurrentDetectionThreshold";
import { StallThreshold_Step400, StallThreshold_Step800 } from "./enum/stallThreshold";
import { Tval } from "./enum/tval";

/**
 * UVLO
 */
export const UvloStatus = {
	notOccurs: 0, // 0:UVLO発生無し
	occurs: 1, // 1:UVLO発生状態
} as const;
export type UvloStatus = (typeof UvloStatus)[keyof typeof UvloStatus];

/**
 * 温度状態(thermalStatus)
 */
export const ThermalStatus = {
	usually: 0,
	warning: 1,
	bridgeShutdown: 2,
	deviceShutdown: 3, // STEP400のみ
} as const;
export type ThermalStatus = (typeof ThermalStatus)[keyof typeof ThermalStatus];

/**
 * 	destIpが変更されたかどうか
 */
export const DestIpChanged = {
	notChanged: 0,
	changed: 1,
} as const;
export type DestIpChanged = (typeof DestIpChanged)[keyof typeof DestIpChanged];

/**
 * マイクロステッピングのモード
 */
export const MicroStepMode = {
	msFull: 0,
	msHalf: 1,
	ms1_4: 2,
	ms1_8: 3,
	ms1_16: 4,
	ms1_32: 5,
	ms1_64: 6,
	ms1_128: 7,
} as const;
export type MicroStepMode = (typeof MicroStepMode)[keyof typeof MicroStepMode];

/**
 * モータの動作状態(MOT_STATUS)
 */
export const MotorStatus = {
	stop: 0,
	accelerating: 1,
	decelerating: 2,
	constantSpeed: 3,
} as const;
export type MotorStatus = (typeof MotorStatus)[keyof typeof MotorStatus];

/**
 * モータドライバが過電流状態(step400)
 */
export type OverCurrentDetectionThreshold_Step400 =
	(typeof OverCurrentDetectionThreshold_Step400)[keyof typeof OverCurrentDetectionThreshold_Step400];

/**
 * モータドライバが過電流状態(step800)
 */
export type OverCurrentDetectionThreshold_Step800 =
	(typeof OverCurrentDetectionThreshold_Step800)[keyof typeof OverCurrentDetectionThreshold_Step800];

/**
 * モータドライバでストール（脱調）検出の閾値(step400)
 */
export type StallThreshold_Step400 =
	(typeof StallThreshold_Step400)[keyof typeof StallThreshold_Step400];

/**
 * モータドライバでストール（脱調）検出の閾値(step800)
 */
export type StallThreshold_Step800 =
	(typeof StallThreshold_Step800)[keyof typeof StallThreshold_Step800];

/**
 * Tval
 */
export type Tval = (typeof Tval)[keyof typeof Tval];

/**
 * 原点復帰の現在のステータス
 */
export const HomingStatus = {
	undefined: 0, // 	原点復帰をまだしていない状態
	goUntil: 1, // /goUntil実行中
	releaseSw: 2, // /releaseSw実行中
	completed: 3, // 	原点復帰完了
	timeout: 4, // 	規定時間内に動作が完了しなかった
} as const;
export type HomingStatus = (typeof HomingStatus)[keyof typeof HomingStatus];

export const ACT = {
	reset: 0, // ABS_POSレジスタをリセットします
	copyToMark: 1, // ASB_POSレジスタの内容をMARKレジスタにコピーします
};
export type ACT = (typeof ACT)[keyof typeof ACT];

export const SwState = {
	open: 0,
	closed: 1,
};
export type SwState = (typeof SwState)[keyof typeof SwState];

export const SwMode = {
	hardStopInterrupt: 0, // 即時停止する
	userDisposal: 1, // 停止しない
};
export type SwMode = (typeof SwMode)[keyof typeof SwMode];

export const BrakeState = {
	hold: 0, // ブレーキを保持
	release: 1, // ブレーキを解除する
};
export type BrakeState = (typeof BrakeState)[keyof typeof BrakeState];

// ------ 共通 ------------------------

/**
 * 回転方向
 */
export const Direction = {
	reverse: 0,
	forward: 1,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

/**
 * 状態
 */
export const ActivationStatus = {
	disable: 0,
	enable: 1,
} as const;
export type ActivationStatus = (typeof ActivationStatus)[keyof typeof ActivationStatus];
