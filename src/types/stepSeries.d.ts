import {
	Direction,
	HomingStatus,
	MotorStatus,
	SwState,
	ThermalStatus,
	UvloStatus,
} from "../data/enums";

export interface DestIpObj {
	destIp_0: number; // destIpの各桁
	destIp_1: number; // destIpの各桁
	destIp_2: number; // destIpの各桁
	destIp_3: number; // destIpの各桁
	isNewDestIp: DestIpChanged; // destIpが変更されたかどうかを示します。変更されていると1, すでに同じアドレスが設定されていた場合は0
}

export interface VersionObj {
	info: string; // ファームウェアの名称 + ファームウェアのバージョン + ファームウェアがコンパイルされた日時
}

export interface ConfigNameObj {
	configName: string; // コンフィギュレーションの名称。
	sdInitializeSucceeded: boolean; // microSDカードとの通信に成功したかどうか
	configFileOpenSucceeded: boolean; // コンフィギュレーションファイルを開くことができたかどうか
	configFileParseSucceeded: boolean; // コンフィギュレーションファイルのJsonをパースできたかどうか
}
export type Step400MotorId = 1 | 2 | 3 | 4 | 255;
export type Step800MotorId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 255;
export type MotorId = Step400MotorId | Step800MotorId;

// 共通
export interface MotorBaseObj {
	motorID: MotorId; // モーターのID (1 はじまり)
}

// -------------------------------------------------------------------------------------------
// モータドライバの設定
// https://ponoor.com/docs/step-series/osc-command-reference/motordriver-settings/
// -------------------------------------------------------------------------------------------

export interface MicrostepModeObj extends MotorBaseObj {
	STEP_SEL: MicroStepMode | MicroStepMode[]; // 	Micro stepping mode
}

export interface LowSpeedOptimizeThresholdObj extends MotorBaseObj {
	lowSpeedOptimizeThreshold: number | number[]; // 0.0 - 976.3 [step/s]	Low speed optimization threshold
}

export interface BusyObj extends MotorBaseObj {
	state: ActivationStatus | ActivationStatus[]; // 	1:BUSYの場合, 0:BUSYでない場合
}

export interface HiZObj extends MotorBaseObj {
	state: ActivationStatus | ActivationStatus[]; // 1:HiZ状態の場合, 0:HiZ状態でない場合
}

export interface DirObj extends MotorBaseObj {
	direction: Direction | Direction[]; // 	1:正転方向, 0:逆転方向
}

export interface MotorStatusObj extends MotorBaseObj {
	MOT_STATUS: MotorStatus | MotorStatus[]; // 	Motor status (0:モータ停止 , 1:加速中, 2: 減速中, 3:	一定速運転中 )
}

export interface StatusObj extends MotorBaseObj {
	status: number | number[]; // 	0-65535(0xFFFF)	16bitのSTATUSレジスタ
}

export interface ConfigRegisterObj extends MotorBaseObj {
	CONFIG: number | number[]; // 0-65535(0xFFFF)	16bitのCONFIGレジスタ
}

// -------------------------------------------------------------------------------------------
// アラーム
// https://ponoor.com/docs/step-series/osc-command-reference/alarm-settings/
// -------------------------------------------------------------------------------------------

export interface UvloObj extends MotorBaseObj {
	state: UvloStatus | UvloStatus[]; // 1:UVLO発生状態 0:UVLO発生無し
}

export interface ThermalStatusObj extends MotorBaseObj {
	thermalStatus: ThermalStatus | ThermalStatus[]; //0	通常/ 1	Warning	135℃	125℃ / 2	Bridge shutdown	155℃	145℃ / 3	Device shutdown	170℃
}

export interface OverCurrentThresholdObj extends MotorBaseObj {
	overCurrentThreshold: number | number[]; // 閾値をmA単位であらわしたものです
}

export interface StallThresholdObj extends MotorBaseObj {
	stallThreshold: number | number[]; // 閾値をmA単位であらわしたものです
}

export interface ProhibitMotionOnHomeSwObj extends MotorBaseObj {
	enable: ActivationStatus | ActivationStatus[]; // 1:禁止, 0:許可
}

// -------------------------------------------------------------------------------------------
// 電圧モード、電流モードの設定
// https://ponoor.com/docs/step-series/osc-command-reference/voltage-and-current-mode-settings/
// -------------------------------------------------------------------------------------------
export interface KvalObj extends MotorBaseObj {
	holdKVAL: number | number[]; //0-255	停止時のKVA
	runKVAL: number | number[]; //0-255	一定速運転時のKVAL
	accKVAL: number | number[]; //0-255	加速時のKVAL
	setDecKVAL: number | number[]; //0-255	減速時のKVAL
}

export interface BemfParamObj extends MotorBaseObj {
	INT_SPEED: number | number[]; //	0-16383(0x3FFF)	INT_SPEEDレジスタの値
	ST_SLP: number | number[]; //0-255(0xFF)	ST_SLPレジスタの値
	FN_SLP_ACC: number | number[]; //	0-255(0xFF)	FN_SLP_ACCレジスタの値
	FN_SLP_DEC: number | number[]; //	0-255(0xFF)	FN_SLP_DECレジスタの値
}

// -------------------------------------------------------------------------------------------
// スピードプロファイル
// https://ponoor.com/docs/step-series/osc-command-reference/speed-profile/
// -------------------------------------------------------------------------------------------
export interface SpeedProfileObj extends MotorBaseObj {
	acc: number | number[]; // 14.55 - 59590 [step/s/s] 加速度
	dec: number | number[]; // 14.55 - 59590 [step/s/s] 減速度
	maxSpeed: number | number[]; // 15.25 - 15610 [step/s] 最大速さ
}

export interface FullstepSpeedObj extends MotorBaseObj {
	fullstepSpeed: number | number[]; // 	7.63-15625 [step/s]	切り替わる閾値
}

export interface MinSpeedObj extends MotorBaseObj {
	minSpeed: number | number[]; // 0.238 - 976.3 [step/s]	最小速さ
}

export interface SpeedObj extends MotorBaseObj {
	speed: number | number[]; // -15625 - 15625 [step/s]	現在の速度
}

// -------------------------------------------------------------------------------------------
// 原点復帰
// https://ponoor.com/docs/step-series/osc-command-reference/homing/
// -------------------------------------------------------------------------------------------

export interface HomingStatusObj extends MotorBaseObj {
	homingStatus: HomingStatus | HomingStatus[]; // 0	HOMING_UNDEFINED	原点復帰をまだしていない状態 | 1	HOMING_GOUNTIL	/goUntil実行中 | 2	HOMING_RELEASESW	/releaseSw実行中 | 3	HOMIMG_COMPLETED	原点復帰完了 | 4	HOMING_TIMEOUT	規定時間内に動作が完了しなかった
}

export interface HomingDirectionObj extends MotorBaseObj {
	homingDirection: Direction | Direction[]; // 0-1	1:Forward, 0:Reverse
}

export interface HomingSpeedObj extends MotorBaseObj {
	homingSpeed: number | number[]; // 0.0-15625.0[step/s]	Homing Speed
}

export interface GoUnitlTimeoutObj extends MotorBaseObj {
	timeout: number | number[]; // 	0-4294967295[ms]	タイムアウト時間
}

export interface ReleaseSwTimeoutObj extends MotorBaseObj {
	timeout: number | number[]; // 	0-10000[ms]	タイムアウト時間
}

// -------------------------------------------------------------------------------------------
// HOME/LIMITセンサ
// https://ponoor.com/docs/step-series/osc-command-reference/home-limit-sensors/
// -------------------------------------------------------------------------------------------
export interface HomeSwObj extends MotorBaseObj {
	swState: SwState | SwState[]; // 状態
	direction: SwState | SwState[]; // 方向
}

export interface HomeSwModeObj extends MotorBaseObj {
	swMode: SwState | SwState[];
}

// -------------------------------------------------------------------------------------------
// 座標
// https://ponoor.com/docs/step-series/osc-command-reference/absolute-position-management/
// -------------------------------------------------------------------------------------------
export interface PositionObj extends MotorBaseObj {
	ABS_POS: number | number[]; // -2,097,152 - 2,097,151 現在位置
}

export interface PositionListObj {
	positions: number[];
}

export interface ElPosObj extends MotorBaseObj {
	fullstep: number | number[]; // 	0-3	フルステップでの位置
	microstep: number | number[]; //	0-127	マイクロステップでの位置
}

export interface MarkObj extends MotorBaseObj {
	mark: number | number[]; // MARKの座標(int)
}

// -------------------------------------------------------------------------------------------
// 電磁ブレーキ
// https://ponoor.com/docs/step-series/osc-command-reference/brake/
// -------------------------------------------------------------------------------------------
export interface BrakeTransitionDurationObj extends MotorBaseObj {
	duration: number | number[]; // 0-10000 [ms]	遷移時間
}

// -------------------------------------------------------------------------------------------
// サーボモード
// https://ponoor.com/docs/step-series/osc-command-reference/servo-mode/
// -------------------------------------------------------------------------------------------
export interface ServoParamObj extends MotorBaseObj {
	kP: number | number[]; // 0.0-	比例制御ゲイン
	kI: number | number[]; // 0.0-	積分制御ゲイン
	kD: number | number[]; // 0.0-	微分制御ゲイン
}
