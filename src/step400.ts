import { OverCurrentDetectionThreshold_Step400, StallThreshold_Step400, Tval } from "./data/enums";
import StepSeries from "./stepSeries";
import {
	AdcValObj,
	DecayModeParamObj,
	LimitSwModeObj,
	LimitSwObj,
	ProhibitMotionOnLimitSwObj,
	Tval_mAObj,
	TvalObj,
} from "./types/step400";
import { MotorId } from "./types/stepSeries";
import { OscValue } from "./types/types";

/**
 * step400
 */
export default class Step400 extends StepSeries {
	readonly STEP_400 = "step400";
	stepType: string = this.STEP_400;
	motorMaxCount: number = 4;

	// -------------------------------------------------------------------------------------------
	// モータドライバの設定
	// https://ponoor.com/docs/step-series/osc-command-reference/motordriver-settings/
	// -------------------------------------------------------------------------------------------

	// ====== デバッグ ======
	/**
	 * PowerSTEP01チップのADC_OUTレジスタの値を取得します。このレジスタはADCピンの電圧を5ビットでAD変換した値が収められています。このピンは10kΩでプルアップされていて、LIMITSWコネクタに接続されています。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getAdcVal(motorId: number): Promise<AdcValObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getAdcVal",
			["i"],
			[motorId],
			"/adcVal",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				ADC_OUT: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			ADC_OUT: data.args[1] as number,
		};
	}

	// -------------------------------------------------------------------------------------------
	// アラーム
	// https://ponoor.com/docs/step-series/osc-command-reference/alarm-settings/
	// -------------------------------------------------------------------------------------------

	// ====== モータドライバ ======
	/**
	 * Limitセンサが反応している状態で、原点復帰方向の逆方向へのモーションコマンドを禁止します。
	 * 原点復帰方向は configTool や /setHomingDirectionで設定できます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable
	 */
	setProhibitMotionOnLimitSw(motorId: number, enable: 1 | 0): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setProhibitMotionOnLimitSw",
			["i", "i"],
			[motorId, enable],
		);
	}

	/**
	 * Limitセンサが反応している状態で、原点復帰方向の逆方向へのモーションコマンドが禁止されているかどうかを返します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getProhibitMotionOnLimitSw(motorId: number): Promise<ProhibitMotionOnLimitSwObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getProhibitMotionOnLimitSw",
			["i"],
			[motorId],
			"/prohibitMotionOnLimitSw",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				enable: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as (0 | 1)[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			enable: data.args[1] as 1 | 0,
		};
	}

	// -------------------------------------------------------------------------------------------
	// 電圧モード、電流モードの設定
	// https://ponoor.com/docs/step-series/osc-command-reference/voltage-and-current-mode-settings/
	// -------------------------------------------------------------------------------------------

	// ====== 電圧モード ======
	/**
	 * 指定したモータを電圧モードに切り替えます。STEP800は常に電圧モードで動作しますので、この切替コマンドはSTEP400のみ利用可能です。
	 * 実行可能タイミング : HiZ状態
	 * @param motorId
	 */
	setVoltageMode(motorId: number): void {
		this.sendOsc(this.host, this.port, "/setVoltageMode", ["i"], [motorId]);
	}

	// ====== 電流モード ======
	/**
	 * 指定したモータを電流モードに切り替えます。
	 * 実行可能タイミング : HiZ状態
	 * @param motorId
	 */
	setCurrentMode(motorId: number): void {
		this.sendOsc(this.host, this.port, "/setCurrentMode", ["i"], [motorId]);
	}

	/**
	 * TVAL4種をまとめて設定します。 STEP400では、TVALは以下のようになっています。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param holdTVAL 0-127 停止時のTVAL (初期値: 16（1328.125mA）)
	 * @param runTVAL 0-127 一定速運転時のTVAL (初期値: 16（1328.125mA）)
	 * @param accTVAL 0-127 加速時のTVAL (初期値: 16（1328.125mA）)
	 * @param setDecTVAL 0-127 減速時のTVAL (初期値: 16（1328.125mA）)
	 */
	setTval(motorId: number, holdTVAL: Tval, runTVAL: Tval, accTVAL: Tval, setDecTVAL: Tval): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setTval",
			["i", "i", "i", "i", "i"],
			[motorId, holdTVAL, runTVAL, accTVAL, setDecTVAL],
		);
	}

	/**
	 * TVAL4種をまとめて取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getTval(motorId: number): Promise<TvalObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getTval",
			["i"],
			[motorId],
			"/tval",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				holdTVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				runTVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				accTVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
				decTVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![4];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			holdTVAL: data.args[1] as Tval,
			runTVAL: data.args[2] as Tval,
			accTVAL: data.args[3] as Tval,
			decTVAL: data.args[4] as Tval,
		};
	}

	/**
	 * TVAL4種をまとめて取得します。レジスタの値ではなく単位[mA]の設定値で返します。
	 * 実行可能タイミング : 常時
	 */
	async getTval_mA(motorId: number): Promise<Tval_mAObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getTval_mA",
			["i"],
			[motorId],
			"/tval_mA",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				holdTVAL_mA: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				runTVAL_mA: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				accTVAL_mA: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
				decTVAL_mA: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![4];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			holdTVAL_mA: data.args[1] as number,
			runTVAL_mA: data.args[2] as number,
			accTVAL_mA: data.args[3] as number,
			decTVAL_mA: data.args[4] as number,
		};
	}

	/**
	 * 電流制御アルゴリズムのパラメータのレジスタを設定します。各レジスタの設定値については PowerSTEP01のデータシートを参照してください。
	 * 実行可能タイミング : HiZ状態
	 * @param motorId
	 * @param t_fast 0-255(0xFF) T_FASTレジスタの値 (初期値: 25 (0x19))
	 * @param ton_min 0-255(0xFF) TON_MINレジスタの値 (初期値: 41 (0x29))
	 * @param toff_min 0-255(0xFF) TOFF_MINレジスタの値 (初期値: 41 (0x29))
	 */
	setDecayModeParam(motorId: number, t_fast: number, ton_min: number, toff_min: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setDecayModeParam",
			["i", "i", "i", "i"],
			[motorId, t_fast, ton_min, toff_min],
		);
	}

	/**
	 * 電流制御アルゴリズムのパラメータを設定するレジスタ値を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getDecayModeParam(motorId: number): Promise<DecayModeParamObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getDecayModeParam",
			["i"],
			[motorId],
			"/decayModeParam",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				T_FAST: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				TON_MIN: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				TOFF_MIN: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			T_FAST: data.args[1] as number,
			TON_MIN: data.args[2] as number,
			TOFF_MIN: data.args[3] as number,
		};
	}

	// -------------------------------------------------------------------------------------------
	// HOME/LIMITセンサ
	// https://ponoor.com/docs/step-series/osc-command-reference/home-limit-sensors/
	// -------------------------------------------------------------------------------------------

	/**
	 * 指定したモータのLIMITスイッチ端子の状態に変化があったら自動でメッセージを送信する設定を行います。
	 * 送信されるメッセージは/getLimitSwの返答と同じです。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 1: 有効, 0: 無効 (初期値: 0 (無効))
	 */
	enableLimitSwReport(motorId: number, enable: 1 | 0): void {
		this.sendOsc(this.host, this.port, "/enableLimitSwReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * LIMITスイッチの状態を取得します。
	 * @param motorId
	 */
	async getLimitSw(motorId: number): Promise<LimitSwObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getLimitSw",
			["i"],
			[motorId],
			"/limitSw",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				swState: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as (0 | 1)[],
				direction: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as (0 | 1)[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			swState: data.args[1] as 0 | 1,
			direction: data.args[2] as 0 | 1,
		};
	}

	// ====== 反応時の動作設定 ======

	/**
	 * LIMITスイッチ端子に入力があった際に即時停止するかどうか(Switch mode)を指定します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param sw_mode 0-1	Switch mode (初期値: 1 (User disposal))
	 */
	setLimitSwMode(motorId: number, sw_mode: 0 | 1): void {
		this.sendOsc(this.host, this.port, "/setLimitSwMode", ["i", "i"], [motorId, sw_mode]);
	}

	/**
	 * setLimitSwModeのSwitch modeを取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getLimitSwMode(motorId: number): Promise<LimitSwModeObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getLimitSwMode",
			["i"],
			[motorId],
			"/limitSwMode",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				swMode: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as (0 | 1)[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			swMode: data.args[1] as 0 | 1,
		};
	}

	// -------------------------------------------------------------------------------------------
	// 設定値が異なるコマンド
	// -------------------------------------------------------------------------------------------
	/**
	 * @param threshold 0-31 312.5mA-10A (初期値: 15 (5A))
	 */
	setOverCurrentThreshold(motorId: number, threshold: OverCurrentDetectionThreshold_Step400): void {
		if (threshold < 0 || threshold > 31)
			throw new Error("threshold value must be between 0 and 31");
		super.setOverCurrentThreshold(motorId, threshold);
	}

	/**
	 * @param st_th 0-31 312.5mA-10A (初期値: 31 (10A))
	 */
	setStallThreshold(motorId: number, stall_th: StallThreshold_Step400): void {
		if (stall_th < 0 || stall_th > 31) throw new Error("stall_th value must be between 0 and 31");
		super.setStallThreshold(motorId, stall_th);
	}
}
