import EventEmitter from "events";
import Motor from "./motor";
import {
	BemfParamObj,
	BrakeTransitionDurationObj,
	BusyObj,
	ConfigNameObj,
	ConfigRegisterObj,
	DirObj,
	ElPosObj,
	FullstepSpeedObj,
	GoUnitlTimeoutObj,
	HiZObj,
	HomeSwModeObj,
	HomeSwObj,
	HomingDirectionObj,
	HomingSpeedObj,
	HomingStatusObj,
	KvalObj,
	LowSpeedOptimizeThresholdObj,
	MarkObj,
	MicrostepModeObj,
	MinSpeedObj,
	MotorStatusObj,
	OverCurrentThresholdObj,
	PositionListObj,
	ProhibitMotionOnHomeSwObj,
	ReleaseSwTimeoutObj,
	ServoParamObj,
	DestIpObj,
	SpeedObj,
	SpeedProfileObj,
	StallThresholdObj,
	StatusObj,
	ThermalStatusObj,
	UvloObj,
	VersionObj,
	MotorId,
} from "./types/stepSeries";
import { Settings } from "./data/settings";
import { OscValue } from "./types/types";
import { ConfigJson } from "./types/configJson";
import {
	ACT,
	ActivationStatus,
	DestIpChanged,
	Direction,
	HomingStatus,
	MotorStatus,
	OverCurrentDetectionThreshold_Step400,
	OverCurrentDetectionThreshold_Step800,
	StallThreshold_Step400,
	StallThreshold_Step800,
	MicroStepMode,
	SwState,
	ThermalStatus,
	UvloStatus,
	SwMode,
	BrakeState,
} from "./data/enums";

export default abstract class StepSeries extends EventEmitter {
	readonly port: number = 50000;
	id: number = 100;
	motors: Motor[] = [];
	abstract stepType: string;
	abstract motorMaxCount: number;
	oscListeners: Map<
		symbol,
		(address: string, args: (string | number | boolean | null | Blob)[]) => void
	> = new Map();
	oscWaitReceivedData: {
		[key: symbol]: { args: Array<Array<OscValue>> | null };
	} = {};

	// events
	readonly OSC_RECEIVED = "oscReceived";
	readonly BOOTED_EVENT = "booted";
	readonly ERROR_OSC_EVENT = "errorOsc";
	readonly ERROR_COMMAND_EVENT = "errorCommand";
	readonly UVLO_EVENT = "uvlo";
	readonly THERMAL_EVENT = "thermal";
	readonly OVER_CURRENT_EVENT = "overCurrent";
	readonly STALL_EVENT = "stall";

	sendOsc: (
		host: string,
		port: number,
		address: string,
		types: string[],
		args: OscValue[],
	) => void = () => {};

	/**
	 * setup
	 * @param boardId ボードID
	 * @param useMotorIds BOARDのどのモーターを使用するかの配列
	 * @param sendOsc OSC送信関数
	 * @param config 設定ファイル
	 * @param stepAngle ステップ角(各モーターのデータシートに記載) ...ByAngleファンクションを使用する場合正確な値を入力する必要があります
	 */
	async setup(
		boardId: number = 1,
		useMotorIds: number[],
		sendOsc: (
			host: string,
			port: number,
			address: string,
			types: string[],
			args: OscValue[],
		) => void,
		config?: ConfigJson, // json
		stepAngle: number | number[] = 1.8,
	): Promise<void> {
		this.id = Math.floor(boardId) + 100;
		if (this.id < 100 || this.id > 255) {
			throw new Error(
				"Step Series Board ID must be 1 to 254. The default value for id is 100, so the IP range is 100~254.",
			); // start ip 100 ~ end ip 254
		}
		this.sendOsc = sendOsc;
		for (let i = 0; i < useMotorIds.length; i++) {
			const motorId = useMotorIds[i];
			let stepAngleValue = stepAngle;
			if (stepAngle instanceof Array) stepAngleValue = stepAngle[i]; // 配列の場合は各モーターごとのステップ角を指定
			this.motors.push(new Motor(motorId, stepAngleValue as number));
		}
		await this.setDestIp();
		if (config) this.applySettingsFromConfig(config);
	}

	/**
	 * get関数でoscを待つための共通処理
	 * @param host IPアドレス
	 * @param port ポート番号
	 * @param address OSCアドレス
	 * @param types OSCアドレスの型
	 * @param args OSCアドレスの引数
	 * @param receivedAddress 待つOSCアドレス
	 * @param motorId モーターID
	 * @returns
	 */
	protected sendOscWaitReceived(
		host: string,
		port: number,
		address: string,
		types: string[],
		args: OscValue[],
		receivedAddress: string,
		motorId: number | null = null,
	): Promise<{
		receivedAddress: string;
		args: OscValue[] | Array<Array<OscValue>>;
	} | null> {
		const timeout = Settings.localTimerTimeout;
		return new Promise((resolve, reject) => {
			const uniqueId = Symbol(); // ユニークな識別子を生成
			if (motorId == 255)
				this.oscWaitReceivedData[uniqueId] = { args: Array(this.motorMaxCount).fill(null) }; // モーターIDが255の場合は全モーターの情報を待つ
			const listener = this.#onSendOscWaitReceived.bind(
				this,
				uniqueId,
				receivedAddress,
				motorId,
				resolve,
			);
			this.oscListeners.set(uniqueId, listener);
			this.addListener(this.OSC_RECEIVED, listener);
			this.sendOsc(host, port, address, types, args);
			setTimeout(() => {
				this.removeListener(this.OSC_RECEIVED, listener);
				if (this.oscWaitReceivedData[uniqueId]) delete this.oscWaitReceivedData[uniqueId];
				this.oscListeners.delete(uniqueId);
				reject(new Error(`${receivedAddress} timeout`));
			}, timeout);
		});
	}
	/**
	 * oscReceivedしたらここを通過する
	 * @param uniqueId 各イベントを識別するためのユニークID
	 * @param receivedAddress 指定したレシーブアドレス
	 * @param resolve
	 * @param address oscから返却されたアドレス
	 * @param args OSC返却情報
	 */
	#onSendOscWaitReceived(
		uniqueId: symbol,
		receivedAddress: string,
		motorId: number | null,
		resolve: (data: { receivedAddress: string; args: OscValue[] | Array<Array<OscValue>> }) => void,
		address: string,
		args: OscValue[],
	): void {
		if (receivedAddress == address) {
			// モーターIDが指定されている場合、そのモーターIDと一致しない場合は無視
			if (motorId && motorId != 255 && motorId != args[0]) return;

			const id = this.oscListeners.get(uniqueId);
			if (id) {
				// 255のときの処理
				if (motorId && motorId == 255) {
					const data = this.oscWaitReceivedData[uniqueId];
					if (data) {
						data.args![(args[0] as number) - 1] = args; // 配列全体を代入 ( motorIdは1からなので -1する)
						console.log(data.args);
						if (data.args!.every((arg) => arg)) {
							delete this.oscWaitReceivedData[uniqueId];
							this.removeListener(this.OSC_RECEIVED, id);
							this.oscListeners.delete(uniqueId);
							resolve({ receivedAddress, args: data.args as Array<Array<OscValue>> });
						} else return;
					}
				}

				// それ以外の処理
				this.removeListener(this.OSC_RECEIVED, id);
				if (this.oscWaitReceivedData[uniqueId]) delete this.oscWaitReceivedData[uniqueId];
				this.oscListeners.delete(uniqueId);
				resolve({ receivedAddress, args });
			}
		}
	}

	/**
	 * get ip address
	 */
	get host(): string {
		return `10.0.0.${this.id}`;
	}

	/**
	 * oscReceived
	 * @param address OSCアドレス
	 * @param args OSCメッセージの引数
	 */
	oscReceived = (address: string, args: OscValue[]): void => {
		// -------------------------------------------------------------------------------------------
		// 自動送信されるメッセージ
		// https://ponoor.com/docs/step-series/osc-command-reference/automatically-sent-messages-from-step-400/
		// -------------------------------------------------------------------------------------------
		// モーターID関係ないもの
		let motorId;
		switch (address) {
			case "/booted": {
				// （再）起動した際に自動的に本デバイスから送信されるメッセージです。
				// 何らかの理由で本デバイスがリセットされたことを検出できます。
				const deviceID = args[0] as number; // 0-255	DIPスイッチで設定されたデバイスのID
				this.emit(this.BOOTED_EVENT, deviceID);
				break;
			}
			case "/error/osc": {
				// 受け取ったOSCメッセージに何らかのエラーがあった場合に送信されます。
				const oscErrorText = args[0] as string; // エラーメッセージ
				this.emit(this.ERROR_OSC_EVENT, oscErrorText);
				break;
			}
			case "/error/command": {
				// コマンドの実行時にエラーが発生した場合に送信されます。
				// /reportError によって、送信の有効/無効を切り替えることができます。
				const commandErrorText = args[0] as string; // エラーメッセージ
				motorId = args[1] as number; // エラーが発生したモーターのID
				this.emit(this.ERROR_OSC_EVENT, commandErrorText, motorId);
				break;
			}
			case "/uvlo": {
				if (args[1] == UvloStatus.occurs) {
					motorId = args[0] as number;
					this.emit(this.UVLO_EVENT, motorId);
				}
				break;
			}
			case "/thermalStatus": {
				const thermalStatus = args[1] as ThermalStatus;
				motorId = args[0] as number;
				switch (thermalStatus) {
					case ThermalStatus.usually: // 通常
						this.emit(this.THERMAL_EVENT, motorId, "通常");
						break;
					case ThermalStatus.warning: // Warning	135℃	125℃
						this.emit(this.THERMAL_EVENT, motorId, "Warning	135℃	125℃");
						break;
					case ThermalStatus.bridgeShutdown: // Bridge shutdown	155℃	145℃
						this.emit(this.THERMAL_EVENT, motorId, "Bridge shutdown	155℃	145℃");
						break;
					case ThermalStatus.deviceShutdown: // Device shutdown	170℃
						this.emit(this.THERMAL_EVENT, motorId, "Device shutdown	170℃");
						break;
				}
				break;
			}
			case "/overCurrent": {
				// 過電流状態のときにメッセージがくる
				motorId = args[0] as number;
				this.emit(this.OVER_CURRENT_EVENT, motorId);
				break;
			}
			case "/stall": {
				// 過電流状態のときにメッセージがくる
				motorId = args[0] as number;
				this.emit(this.STALL_EVENT, motorId);
				break;
			}
		}
		this.motors.forEach((motor) => motor.oscReceived(address, args));
		this.emit(this.OSC_RECEIVED, address, args);
	};

	/**
	 * 初期設定
	 * apply settings from config file
	 * @param config JSON object from ponoor's repository
	 * https://github.com/ponoor/step-series-support/tree/main/configGenerator
	 */
	applySettingsFromConfig(config: ConfigJson): void {
		const voltageMode = config["voltageMode"];
		this.setKval(
			255,
			voltageMode["KVAL_HOLD"][0],
			voltageMode["KVAL_RUN"][0],
			voltageMode["KVAL_ACC"][0],
			voltageMode["KVAL_DEC"][0],
		);
		const speedProfile = config["speedProfile"];
		this.setSpeedProfile(
			255,
			speedProfile["acc"][0],
			speedProfile["dec"][0],
			speedProfile["maxSpeed"][0],
		);
		const servoMode = config["servoMode"];
		this.setServoParam(255, servoMode["kP"][0], servoMode["kI"][0], servoMode["kD"][0]);
	}

	//-------------------------------------------------------------------------------------------
	// 基板全体の設定
	// https://ponoor.com/docs/step-series/osc-command-reference/system-settings/
	//-------------------------------------------------------------------------------------------
	/**
	 * モータの状態に変化があったときに通知するメッセージや、問い合わせへ返答するメッセージなどの送り先IPアドレス(destIp)を指定します。このメッセージを送信したIPアドレスをdestIpに設定します。
	 * また、destIpが設定されるまでは、本デバイスからOSCメッセージの送信は行いませんので、一番最初にこのコマンドを送信してください。唯一の例外は /booted メッセージです。
	 * 実行可能タイミング: 常時
	 * 初期値 10.0.0.10
	 */
	async setDestIp(): Promise<DestIpObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/setDestIp",
			[],
			[],
			"/destIp",
		);
		if (!data) return null;
		return {
			destIp_0: data.args[0] as number,
			destIp_1: data.args[1] as number,
			destIp_2: data.args[2] as number,
			destIp_3: data.args[3] as number,
			isNewDestIp: data.args[4] as DestIpChanged,
		};
	}

	/**
	 * モータの状態に変化があったときに通知するメッセージや、問い合わせへ返答するメッセージなどの送り先IPアドレス(destIp)を指定します。このメッセージを送信したIPアドレスをdestIpに設定します。
	 * また、destIpが設定されるまでは、本デバイスからOSCメッセージの送信は行いませんので、一番最初にこのコマンドを送信してください。唯一の例外は /booted メッセージです。
	 * 実行可能タイミング: 常時
	 */
	async getVersion(): Promise<VersionObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getVersion",
			[],
			[],
			"/version",
		);
		if (!data) return null;
		return {
			info: data.args[0] as string,
		};
	}

	/**
	 * 起動時にmicroSDカードから読み込まれたコンフィギュレーションファイルの名称を返します。
	 * 実行可能タイミング: 常時
	 */
	async getConfigName(): Promise<ConfigNameObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getConfigName",
			[],
			[],
			"/configName",
		);
		if (!data) return null;
		return {
			configName: data.args[0] as string,
			sdInitializeSucceeded: data.args[1] as boolean,
			configFileOpenSucceeded: data.args[2] as boolean,
			configFileParseSucceeded: data.args[3] as boolean,
		};
	}

	/**
	 * /error/command および /error/osc メッセージの自動送信の有効/無効を切り替えます。
	 * 実行可能タイミング: 常時
	 * @param enable 	0-1	1で有効, 0で無効 (初期値 : 1 (有効))
	 */
	reportError(enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/getConfigName", ["i"], [enable]);
	}

	/**
	 * 基板全体をリセットします。基板上のリセットスイッチを押した場合と同じ動作です。
	 * 実行可能タイミング: 常時
	 */
	resetDevice(): void {
		this.sendOsc(this.host, this.port, "/resetDevice", [], []);
	}

	// -------------------------------------------------------------------------------------------
	// モータドライバの設定
	// https://ponoor.com/docs/step-series/osc-command-reference/motordriver-settings/
	// -------------------------------------------------------------------------------------------

	// ====== モータドライバの設定 ======

	/**
	 * マイクロステッピングのモードを切り替えます。
	 * 実行可能タイミング : HiZ状態
	 * @param motorId
	 * @param mode 0-7	Micro stepping mode
	 */
	setMicroStepMode(motorId: number, mode: MicroStepMode): void {
		this.sendOsc(this.host, this.port, "/setMicrostepMode", ["i", "i"], [motorId, mode]);
	}

	/**
	 * マイクロステッピングのモードを取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getMicroStepMode(motorId: number): Promise<MicrostepModeObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getMicrostepMode",
			["i"],
			[motorId],
			"/microstepMode",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				STEP_SEL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as MicroStepMode[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			STEP_SEL: data.args[1] as MicroStepMode,
		};
	}

	/**
	 * 低速回転時の相電流ひずみ補正 (Low speed optimization) の有効無効を切り替えます。
	 * この設定が有効になっていると、Min Speed は自動的に0になります。
	 * この補正は電圧モードでのみ利用可能です。
	 * 実行可能タイミング : モータ停止時
	 * @param motorId
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	enableLowSpeedOptimize(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableLowSpeedOptimize", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 低速回転時の相電流ひずみ補正 (Low speed optimization) の有効無効を切り替えます。
	 * この設定が有効になっていると、Min Speed は自動的に0になります。
	 * この補正は電圧モードでのみ利用可能です。
	 * 実行可能タイミング : モータ停止時
	 * @param motorId
	 * @param lowSpeedOptimizationThreshold 0.0 - 976.3 [step/s] (初期値: 20.0 [step/s])
	 */
	setLowSpeedOptimizeThreshold(motorId: number, lowSpeedOptimizationThreshold: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setLowSpeedOptimizeThreshold",
			["i", "i"],
			[motorId, lowSpeedOptimizationThreshold],
		);
	}

	/**
	 * Low speed optimization threshold の現在の設定値を取得します
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getLowSpeedOptimizeThreshold(
		motorId: number,
	): Promise<LowSpeedOptimizeThresholdObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getLowSpeedOptimizeThreshold",
			["i"],
			[motorId],
			"/lowSpeedOptimizeThreshold",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				lowSpeedOptimizeThreshold: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			lowSpeedOptimizeThreshold: data.args[1] as number,
		};
	}

	// ====== 状態の取得 ======
	/**
	 * 指定したモータのBUSY状態に変化があったら自動でメッセージを送信する設定を行います。メッセージは/getBusyの返答と同じです。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	enableBusyReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableBusyReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 指定したモータのBUSY状態を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getBusy(motorId: number): Promise<BusyObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getBusy",
			["i"],
			[motorId],
			"/busy",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				state: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as ActivationStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			state: data.args[1] as ActivationStatus,
		};
	}

	/**
	 * 指定したモータのHiZ（ハイインピーダンス）状態に変化があったら自動でメッセージを送信する設定を行います。
	 * 送信されるメッセージは/getHiZの返答と同じです。
	 * @param motorId
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	enableHizReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableHizReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 指定したモータのHiZ状態を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getHiZ(motorId: number): Promise<HiZObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getHiZ",
			["i"],
			[motorId],
			"/HiZ",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				state: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as ActivationStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			state: data.args[1] as ActivationStatus,
		};
	}

	/**
	 * 指定したモータの回転方向に変化があったら自動でメッセージを送信する設定を行います。送信されるメッセージは/getDirの返答と同じです。
	 * 実行可能タイミング : 常時
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	enableDirReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableDirReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 指定したモータの回転方向を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getDir(motorId: number): Promise<DirObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getDir",
			["i"],
			[motorId],
			"/dir",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				direction: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as ActivationStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			direction: data.args[1] as ActivationStatus,
		};
	}

	/**
	 * 指定したモータの動作状態(MOT_STATUS)に変化があったら自動でメッセージを送信する設定を行います。メッセージは/getMotorStatusの返答と同じです。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	enableMotorStatusReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableMotorStatusReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 指定したモータの動作状態(MOT_STATUS)を取得します
	 * MOT_STATUS : { 0: モーター停止中, 1: 加速, 2: 減速中 , 3: 一定停止中 }
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getMotorStatus(motorId: number): Promise<MotorStatusObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getMotorStatus",
			["i"],
			[motorId],
			"/motorStatus",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				MOT_STATUS: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as MotorStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			MOT_STATUS: data.args[1] as MotorStatus,
		};
	}

	/**
	 * 指定したモータの現在位置 (ABS_POS) を指定間隔で自動送信します。0を指定すると無効化され、送信を停止します。
	 * いずれかのモータで有効化された場合、/setPositionListReportIntervalは無効になり自動停止します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param interval : 	0-2147483647 (初期値: 0)
	 */
	setPositionReportInterval(motorId: number, interval: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setPositionReportInterval",
			["i", "i"],
			[motorId, interval],
		);
	}

	/**
	 * 全モータの現在位置 (ABS_POS) をひとつのリストにまとめたメッセージを指定間隔で自動送信します。0を指定すると無効化され、送信を停止します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param interval : 	0-2147483647 (初期値: 0)
	 */
	setPositionListReportInterval(motorId: number, interval: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setPositionListReportInterval",
			["i", "i"],
			[motorId, interval],
		);
	}

	// ====== デバッグ ======
	/**
	 * モータドライバ(PowerSTEP01/L6470)のステータスレジスタを取得します。ステータスレジスタにはモータやアラーム、スイッチの状態などが含まれます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getStatus(motorId: number): Promise<StatusObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getStatus",
			["i"],
			[motorId],
			"/status",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				status: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			status: data.args[1] as number,
		};
	}

	/**
	 * モータドライバ(PowerSTEP01/L6470)のCONFIGレジスタを取得します。CONFIGレジスタにはモータやアラーム、スイッチの状態などが含まれます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param config 0-65535(0xFFFF)	16bitのCONFIGレジスタ
	 */
	async getConfigRegister(motorId: number): Promise<ConfigRegisterObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getConfigRegister",
			["i"],
			[motorId],
			"/configRegister",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				CONFIG: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			CONFIG: data.args[1] as number,
		};
	}

	/**
	 * モータドライバ (PowerSTEP01/L6470) をリセットし、初期設定値を再度書き込みます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	resetMotorDriver(motorId: number): void {
		this.sendOsc(this.host, this.port, "/resetMotorDriver", ["i"], [motorId]);
	}

	// -------------------------------------------------------------------------------------------
	// アラーム
	// https://ponoor.com/docs/step-series/osc-command-reference/alarm-settings/
	// -------------------------------------------------------------------------------------------

	// ====== モータドライバ ======
	/**
	 * 指定したモータドライバで UVLO (Undervoltage Lockout) が発生した際に自動で通知メッセージを送信するかどうかを指定します。
	 * UVLOはモータドライバへ供給されている電圧がUVLO発生条件電圧を下回ったら通知の有無にかかわらず発生します。
	 * この状態ではモータを動かすことはできません。供給電圧がUVLO解除条件電圧を上回ったら解除されます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 1 (有効))
	 */
	enableUvloReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableUvloReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * UVLOの現在の状態を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getUvlo(motorId: number): Promise<UvloObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getUvlo",
			["i"],
			[motorId],
			"/uvlo",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				state: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as ActivationStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			state: data.args[1] as ActivationStatus,
		};
	}

	/**
	 * 指定したモータドライバの温度状態(thermalStatus)に変化があったら自動でメッセージを送信するかどうかを指定します。
	 * Bridge shutdown, Device shutdown 状態では、通知の有無にかかわらずモータはHiZ状態になります。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 1 (有効))
	 */
	enableThermalStatusReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableThermalStatusReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * ThermalStatusの現在の状態を取得します。STEP400とSTEP800では Thermal statusの種類や発生条件が異なります。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getThermalStatus(motorId: number): Promise<ThermalStatusObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getThermalStatus",
			["i"],
			[motorId],
			"/thermalStatus",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				thermalStatus: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as ThermalStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			thermalStatus: data.args[1] as ThermalStatus,
		};
	}

	/**
	 * 指定したモータドライバが過電流状態(OCD, Over Current Detection)になった場合に自動でメッセージを送信するかどうかを指定します。
	 * 過電流状態になった場合は、通知の有無にかかわらず自動でHiZ状態になります。
	 * 閾値は /setOverCurrentThreshold で設定できます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 1 (有効))
	 */
	enableOverCurrentReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableOverCurrentReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 過電流の閾値を設定します。STEP400とSTEP800では設定値の範囲と対応する電流が異なっています。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param ocd_th 	(Overcurrent detection threshold - STEP400 / 0-31 | Overcurrent threshold - STEP800 / 0-15)
	 */
	setOverCurrentThreshold(
		motorId: number,
		ocd_th: OverCurrentDetectionThreshold_Step400 | OverCurrentDetectionThreshold_Step800,
	): void {
		this.sendOsc(this.host, this.port, "/setOverCurrentThreshold", ["i", "i"], [motorId, ocd_th]);
	}

	/**
	 * 過電流の閾値を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getOverCurrentThreshold(motorId: number): Promise<OverCurrentThresholdObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getOverCurrentThreshold",
			["i"],
			[motorId],
			"/overCurrentThreshold",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				overCurrentThreshold: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			overCurrentThreshold: data.args[1] as number,
		};
	}

	/**
	 * 閾値は /setStallThreshold で設定できます。 指定したモータドライバでストール（脱調）が検出された場合、自動で下記のメッセージを送信します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	enableStallReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableStallReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * ストール検出の閾値を設定します。STEP400とSTEP800で設定する値の範囲は異なります。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param st_th  (  STEP400 / 0-31 | STEP800 / 0-127 )	Stall detection threshold
	 */
	setStallThreshold(
		motorId: number,
		stall_th: StallThreshold_Step400 | StallThreshold_Step800,
	): void {
		this.sendOsc(this.host, this.port, "/setStallThreshold", ["i", "i"], [motorId, stall_th]);
	}

	/**
	 * ストール検出の閾値を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getStallThreshold(motorId: number): Promise<StallThresholdObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getStallThreshold",
			["i"],
			[motorId],
			"/stallThreshold",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				stallThreshold: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			stallThreshold: data.args[1] as number,
		};
	}

	/**
	 * Homeセンサが反応している状態で、原点復帰方向へのモーションコマンドを禁止します。
	 * 原点復帰方向は configTool や /setHomingDirectionで設定できます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param enable 0-1 (初期値: 0 (無効))
	 */
	setProhibitMotionOnHomeSw(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/setProhibitMotionOnHomeSw", ["i", "i"], [motorId, enable]);
	}

	/**
	 * Homeセンサが反応している状態で、原点復帰方向へのモーションコマンドが禁止されているかどうかを返します。
	 * @param motorId
	 */
	async getProhibitMotionOnHomeSw(motorId: number): Promise<ProhibitMotionOnHomeSwObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getProhibitMotionOnHomeSw",
			["i"],
			[motorId],
			"/prohibitMotionOnHomeSw",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				enable: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as ActivationStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			enable: data.args[1] as ActivationStatus,
		};
	}

	// -------------------------------------------------------------------------------------------
	// 電圧モード、電流モードの設定
	// https://ponoor.com/docs/step-series/osc-command-reference/voltage-and-current-mode-settings/
	// -------------------------------------------------------------------------------------------

	// ====== 電圧モード ======

	/**
	 * KVAL4種をまとめて設定します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param holdKVAL 0-255
	 * @param runKVAL 0-255
	 * @param accKVAL 0-255
	 * @param setDecKVAL 0-255
	 */
	setKval(
		motorId: number,
		holdKVAL: number,
		runKVAL: number,
		accKVAL: number,
		setDecKVAL: number,
	): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setKval",
			["i", "i", "i", "i", "i"],
			[motorId, holdKVAL, runKVAL, accKVAL, setDecKVAL],
		);
	}

	/**
	 * KVAL4種をまとめて取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getKval(motorId: number): Promise<KvalObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getKval",
			["i"],
			[motorId],
			"/kval",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				holdKVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				runKVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				accKVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
				setDecKVAL: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![4];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			holdKVAL: data.args[1] as number,
			runKVAL: data.args[2] as number,
			accKVAL: data.args[3] as number,
			setDecKVAL: data.args[4] as number,
		};
	}

	/**
	 * BEMF補償パラメータのレジスタを設定します。各レジスタの設定値については 電圧モードの設定 を参照してください。
	 * 実行可能タイミング : HiZ状態
	 * @param motorId
	 * @param int_speed : 0-16383(0x3FFF) (初期値: 1032 (0x0402) )
	 * @param st_slp  : 0-255 (初期値: 25 (0x19) )
	 * @param fn_slp_acc : 0-255 (初期値: 41 (0x29) )
	 * @param fn_slp_dec : 0-255 (初期値: 41 (0x29) )
	 */
	setBemfParam(
		motorId: number,
		int_speed: number,
		st_slp: number,
		fn_slp_acc: number,
		fn_slp_dec: number,
	): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setBemfParam",
			["i", "i", "i", "i", "i"],
			[motorId, int_speed, st_slp, fn_slp_acc, fn_slp_dec],
		);
	}

	/**
	 * BEMFパラメータを設定するレジスタ値を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getBemfParam(motorId: number): Promise<BemfParamObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getBemfParam",
			["i"],
			[motorId],
			"/bemfParam",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				INT_SPEED: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				ST_SLP: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				FN_SLP_ACC: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
				FN_SLP_DEC: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![4];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			INT_SPEED: data.args[1] as number,
			ST_SLP: data.args[2] as number,
			FN_SLP_ACC: data.args[3] as number,
			FN_SLP_DEC: data.args[4] as number,
		};
	}

	// -------------------------------------------------------------------------------------------
	// スピードプロファイル
	// https://ponoor.com/docs/step-series/osc-command-reference/speed-profile/
	// -------------------------------------------------------------------------------------------

	/**
	 * スピードプロファイルのacc, dec, maxSpeedをまとめて設定します。
	 * モーター実行可能タイミング: モータ停止時
	 * @param motorId
	 * @param acc 14.55 - 59590 [step/s/s] 加速度 (初期値: 2000)
	 * @param dec 14.55 - 59590 [step/s/s] 減速度 (初期値: 2000)
	 * @param maxSpeed 15.25 - 15610 [step/s] 最大速さ (初期値: 620)
	 *
	 */
	setSpeedProfile(motorId: number, acc: number, dec: number, maxSpeed: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setSpeedProfile",
			["i", "f", "f", "f"],
			[motorId, acc, dec, maxSpeed],
		);
	}

	/**
	 * スピードプロファイルのacc, dec, maxSpeedをまとめて取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getSpeedProfile(motorId: number): Promise<SpeedProfileObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getSpeedProfile",
			["i"],
			[motorId],
			"/speedProfile",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				acc: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				dec: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				maxSpeed: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			acc: data.args[1] as number,
			dec: data.args[2] as number,
			maxSpeed: data.args[3] as number,
		};
	}

	/**
	 * マイクロステッピングモードが自動でフルステップモードに切り替わる閾値を設定します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param fullstepSpeed 7.63-15625 [step/s] 切り替わる閾値 (初期値: (15625 [step/s]))
	 */
	setFullstepSpeed(motorId: number, fullstepSpeed: number): void {
		this.sendOsc(this.host, this.port, "/setFullstepSpeed", ["i", "f"], [motorId, fullstepSpeed]);
	}

	/**
	 * マイクロステッピングモードが自動でフルステップモードに切り替わる閾値を取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getFullstepSpeed(motorId: number): Promise<FullstepSpeedObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getFullstepSpeed",
			["i"],
			[motorId],
			"/fullstepSpeed",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				fullstepSpeed: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			fullstepSpeed: data.args[1] as number,
		};
	}

	/**
	 * スピードプロファイルの最大速さを設定します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param maxSpeed 15.25 - 15610 [step/s]	最大速さ (初期値: 620[step/s])
	 */
	setMaxSpeed(motorId: number, maxSpeed: number): void {
		this.sendOsc(this.host, this.port, "/setMaxSpeed", ["i", "f"], [motorId, maxSpeed]);
	}

	/**
	 * スピードプロファイルの加速度を設定します。
	 * 実行可能タイミング : モーター停止時
	 * @param motorId
	 * @param acc 14.55 - 59590 [step/s/s] 加速度 (初期値: 2000)
	 */
	setAcc(motorId: number, acc: number): void {
		this.sendOsc(this.host, this.port, "/setAcc", ["i", "f"], [motorId, acc]);
	}

	/**
	 * スピードプロファイルの減速度 (deceleration) を設定します。
	 * 実行可能タイミング : モーター停止時
	 * @param motorId
	 * @param dec 14.55 - 59590 [step/s/s] 減速度 (初期値: 2000)
	 */
	setDec(motorId: number, dec: number): void {
		this.sendOsc(this.host, this.port, "/setDec", ["i", "f"], [motorId, dec]);
	}

	/**
	 * スピードプロファイルの最小速さを設定します。この値は/releaseSw時のモータ回転速さにも使用されます。Low speed optimizationが有効になっている場合、 minSpeedは強制的に0になります。
	 * 実行可能タイミング : モーター停止時
	 * @param motorId
	 * @param minSpeed 0.0 - 976.3 [step/s]	最小速さ (初期値: 0.0)
	 */
	setMinSpeed(motorId: number, minSpeed: number): void {
		this.sendOsc(this.host, this.port, "/setMinSpeed", ["i", "f"], [motorId, minSpeed]);
	}

	/**
	 * スピードプロファイルの最小速さを返します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getMinSpeed(motorId: number): Promise<MinSpeedObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getMinSpeed",
			["i"],
			[motorId],
			"/minSpeed",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				minSpeed: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			minSpeed: data.args[1] as number,
		};
	}

	/**
	 * モータの現在の速度を返します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getSpeed(motorId: number): Promise<SpeedObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getSpeed",
			["i"],
			[motorId],
			"/speed",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				speed: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			speed: data.args[1] as number,
		};
	}

	// -------------------------------------------------------------------------------------------
	// 原点復帰
	// https://ponoor.com/docs/step-series/osc-command-reference/homing/
	// -------------------------------------------------------------------------------------------

	/**
	 * 原点復帰動作を行います。原点復帰方向に移動し、HOMEセンサが反応すると停止し、方向を反転してゆっくり移動し、HOMEセンサが反応しなくなった時点で停止し、現在位置を0にします。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	homing(motorId: number): void {
		this.sendOsc(this.host, this.port, "/homing", ["i"], [motorId]);
	}

	/**
	 * 原点復帰の現在のステータスを返します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getHomingStatus(motorId: number): Promise<HomingStatusObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getHomingStatus",
			["i"],
			[motorId],
			"/homingStatus",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				homingStatus: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as HomingStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			homingStatus: data.args[1] as HomingStatus,
		};
	}

	/**
	 * /homing実行時の原点復帰方向homingDirectionを指定します。configToolからも指定できます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param direction 0-1	1:Forward, 0:Reverse
	 */
	setHomingDirection(motorId: number, direction: Direction): void {
		this.sendOsc(this.host, this.port, "/setHomingDirection", ["i", "i"], [motorId, direction]);
	}

	/**
	 * homingDirectionを取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getHomingDirection(motorId: number): Promise<HomingDirectionObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getHomingDirection",
			["i"],
			[motorId],
			"/homingDirection",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				homingDirection: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as (0 | 1)[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			homingDirection: data.args[1] as 0 | 1,
		};
	}

	/**
	 * /homing実行時の原点復帰速さhomingSpeedを指定します。configToolからも指定できます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param speed 0.0-15625.0[step/s]	homingSpeed (初期値: 100.0)
	 */
	setHomingSpeed(motorId: number, speed: number): void {
		this.sendOsc(this.host, this.port, "/setHomingSpeed", ["i", "f"], [motorId, speed]);
	}

	/**
	 * homingSpeedを取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 */
	async getHomingSpeed(motorId: number): Promise<HomingSpeedObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getHomingSpeed",
			["i"],
			[motorId],
			"/homingSpeed",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				homingSpeed: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			homingSpeed: data.args[1] as number,
		};
	}

	/**
	 * homingSpeedを取得します。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param ACT 0	ABS_POSレジスタをリセットします | 1	ASB_POSレジスタの内容をMARKレジスタにコピーします
	 * @param speed 0.0-15625.0[step/s]	homingSpeed
	 */
	goUntil(motorId: number, ACT: ACT, speed: number): void {
		this.sendOsc(this.host, this.port, "/goUntil", ["i", "i", "f"], [motorId, ACT, speed]);
	}

	/**
	 * /goUnitl実行時のタイムアウト時間を指定します。この時間内にセンサに反応がなかった場合にはtimeoutとして動作を中止します。0を指定するとタイムアウトが無効になります。configToolからも指定できます。
	 * 実行可能タイミング : 常時
	 * @param motorId
	 * @param timeOut 0-4294967295[ms] 	タイムアウト時間
	 */
	setGoUntilTimeout(motorId: number, timeOut: number): void {
		this.sendOsc(this.host, this.port, "/setGoUntilTimeout", ["i", "i"], [motorId, timeOut]);
	}

	/**
	 * /goUnitl実行時のタイムアウト時間を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getGoUntilTimeout(motorId: number): Promise<GoUnitlTimeoutObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getGoUntilTimeout",
			["i"],
			[motorId],
			"/goUnitlTimeout",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				timeout: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			timeout: data.args[1] as number,
		};
	}

	/**
	 * 指定方向にminimum speed（初期状態では5[step/s]）で回転し、HOMEスイッチ端子が開状態になると、ACTの値に応じた処理を行います。ACTの処理内容は /goUntilと同じです。その後hardStopします。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param ACT 0-1
	 * @param DIR 0-1
	 */
	releaseSw(motorId: number, ACT: ACT, DIR: Direction): void {
		this.sendOsc(this.host, this.port, "/releaseSw", ["i", "i", "i"], [motorId, ACT, DIR]);
	}

	/**
	 * /releaseSw実行時のタイムアウト時間を指定します。この時間内にセンサ反応範囲から脱出できかった場合にはtimeoutとして動作を中止します。0を指定するとタイムアウトが無効になります。configToolからも指定できます。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param timeOut 0-4294967295[ms] 	タイムアウト時間
	 */
	setReleaseSwTimeout(motorId: number, timeOut: number): void {
		this.sendOsc(this.host, this.port, "/setReleaseSwTimeout", ["i", "i", "i"], [motorId, timeOut]);
	}

	/**
	 * /releaseSw実行時のタイムアウト時間を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getReleaseSwTimeout(motorId: number): Promise<ReleaseSwTimeoutObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getReleaseSwTimeout",
			["i"],
			[motorId],
			"/releaseSwTimeout",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				timeout: (data.args as Array<Array<OscValue>>).map((element) => {
					return element![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			timeout: data.args[1] as number,
		};
	}

	// -------------------------------------------------------------------------------------------
	// HOME/LIMITセンサ
	// https://ponoor.com/docs/step-series/osc-command-reference/home-limit-sensors/
	// -------------------------------------------------------------------------------------------

	/**
	 * 指定したモータのHOMEスイッチ端子の状態に変化があったら自動でメッセージを送信する設定を行います。送信されるメッセージは/getHomeSwの返答と同じです。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param enable 0-1	1で有効, 0で無効 (初期値: 0 (無効))
	 */
	enableHomeSwReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableHomeSwReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * 指定したモータのHOMEスイッチ端子の状態がHIGHレベルからLOWレベルに遷移した際(Falling Edge)に自動でメッセージを送信する設定を行います。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param enable 0-1	1で有効, 0で無効 (初期値: 0 (無効))
	 */
	enableSwEventReport(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableSwEventReport", ["i", "i"], [motorId, enable]);
	}

	/**
	 * HOMEスイッチの状態を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getHomeSw(motorId: number): Promise<HomeSwObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getHomeSw",
			["i"],
			[motorId],
			"/homeSw",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				swState: (data.args as Array<Array<OscValue>>).map((element) => {
					return element![1];
				}) as SwState[],
				direction: (data.args as Array<Array<OscValue>>).map((element) => {
					return element![2];
				}) as ActivationStatus[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			swState: data.args[1] as SwState,
			direction: data.args[2] as ActivationStatus,
		};
	}

	// ====== 反応時の動作設定 ======
	/**
	 * HOMEスイッチ端子に入力があった際に即時停止するかどうか(Switch mode)を指定します。
	 * 実行可能タイミング: HiZ状態
	 * @param motorId
	 * @param sw_mode 	0-1	Switch mode (初期値: 1 (HardStop interrupt （即時停止する))
	 */
	setHomeSwMode(motorId: number, sw_mode: SwMode): void {
		this.sendOsc(this.host, this.port, "/setHomeSwMode", ["i", "i"], [motorId, sw_mode]);
	}

	/**
	 * setHomeSwModeのSwitch modeを取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getHomeSwMode(motorId: number): Promise<HomeSwModeObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getHomeSwMode",
			["i"],
			[motorId],
			"/homeSwMode",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				swMode: (data.args as Array<Array<OscValue>>).map((element) => {
					return element![1];
				}) as SwMode[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			swMode: data.args[1] as SwMode,
		};
	}

	// -------------------------------------------------------------------------------------------
	// 座標
	// https://ponoor.com/docs/step-series/osc-command-reference/absolute-position-management/
	// -------------------------------------------------------------------------------------------

	/**
	 * ABS_POSレジスタを指定座標に書き換えます。現在のモータ位置が指定座標になります。
	 * 実行可能タイミング: モータ停止時
	 * @param motorId
	 * @param newPosition -2,097,152 - 2,097,151	指定座標
	 */
	setPosition(motorId: number, newPosition: number): void {
		this.sendOsc(this.host, this.port, "/setPosition", ["i", "i"], [motorId, newPosition]);
	}

	/**
	 * ABS_POSレジスタの内容（現在位置）を取得します。
	 * /setPositionReportInterval コマンドで、指定間隔で自動送信させることもできます。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	getPosition(motorId: number): void {
		this.sendOsc(this.host, this.port, "/getPosition", ["i"], [motorId]);
	}

	/**
	 * 全モータの現在位置 (ABS_POS) を取得します。
	 * /getPosition 255 を送信した場合は、モータの軸数分の個別のメッセージが返されますが、このコマンドは、すべてのモータの位置をリストにまとめた1個のメッセージが返されます。
	 * 実行可能タイミング: 常時
	 */
	async getPositionList(): Promise<PositionListObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getPositionList",
			[],
			[],
			"/positionList",
		);
		if (!data) return null;
		const list: number[] = [];
		for (let i = 0; i < this.motors.length; i += 2) {
			if (data.args[0 + i]) list.push(data.args[0 + i] as number);
		}
		return { positions: list };
	}

	/**
	 * ABS_POSレジスタを0にリセットします。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	resetPos(motorId: number): void {
		this.sendOsc(this.host, this.port, "/resetPos", ["i"], [motorId]);
	}

	/**
	 * モータの電気的位置(electrical postion)を設定します。
	 * マイクロステップは0-127の128段階で表現されていますので、設定時は現在のマイクロステップと齟齬のない値を設定する必要があります。
	 * 実行可能タイミング: モータ停止時
	 * @param motorId
	 * @param newFullstep 0-3	フルステップでの位置
	 * @param newMicrostep 0-127	マイクロステップでの位置
	 */
	setElPos(motorId: number, newFullstep: number, newMicrostep: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setElPos",
			["i", "i", "i"],
			[motorId, newFullstep, newMicrostep],
		);
	}

	/**
	 * モータの電気的位置 (electrical postion)を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getElPos(motorId: number): Promise<ElPosObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getElPos",
			["i"],
			[motorId],
			"/elPos",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				fullstep: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				microstep: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			fullstep: data.args[1] as number,
			microstep: data.args[2] as number,
		};
	}

	// ========== HOME/MARK ==========
	/**
	 * MARKの位置を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param mark 	設定する座標
	 */
	setMark(motorId: number, mark: number): void {
		this.sendOsc(this.host, this.port, "/setMark", ["i", "i"], [motorId, mark]);
	}

	/**
	 * MARKの位置を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getMark(motorId: number): Promise<MarkObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getMark",
			["i"],
			[motorId],
			"/mark",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				mark: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			mark: data.args[1] as number,
		};
	}

	/**
	 * HOME位置までスピードプロファイルに従って移動します。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 */
	goHome(motorId: number): void {
		this.sendOsc(this.host, this.port, "/goHome", ["i"], [motorId]);
	}

	/**
	 * MARK位置までスピードプロファイルに従って移動します。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 */
	goMark(motorId: number): void {
		this.sendOsc(this.host, this.port, "/goMark", ["i"], [motorId]);
	}

	// -------------------------------------------------------------------------------------------
	// モータの回転・停止
	// https://ponoor.com/docs/step-series/osc-command-reference/motor-control/
	// -------------------------------------------------------------------------------------------

	// ========== モータの回転 ==========
	/**
	 * モータを指定速度で回転させます。事前に設定したスピードプロファイルの加速度に従って加速します。
	 * 指定する回転速さは、maxSpeedを超えるとmaxSpeedでリミットされます。指定速度に到達するまではBUSY状態になります。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 * @param speed -15625 - 15625 [step/s]	回転速度
	 */
	run(motorId: number, speed: number): void {
		this.sendOsc(this.host, this.port, "/run", ["i", "f"], [motorId, speed]);
	}

	/**
	 * 事前に設定したスピードプロファイルに従って、指定ステップ数移動します。
	 * 指定ステップ数を移動し終わるまではBUSY状態になります。このコマンドはモータが停止していないと実行できません。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 * @param step step	移動ステップ数
	 */
	move(motorId: number, step: number): void {
		this.sendOsc(this.host, this.port, "/move", ["i", "i"], [motorId, step]);
	}

	/**
	 * 事前に設定したスピードプロファイルにしたがって、指定位置まで最短経路で移動します。指定位置まで移動し終わるまではBUSY状態になります。
	 * ※ドライバ内部では -2,097,152 と 2,097,151 は1周して隣り合った位置になっています。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 * @param position -2,097,152 - 2,097,151	目標位置
	 */
	goTo(motorId: number, position: number): void {
		this.sendOsc(this.host, this.port, "/goTo", ["i", "i"], [motorId, position]);
	}

	/**
	 * 事前に設定したスピードプロファイルにしたがって、指定位置まで指定方向で移動します。指定位置まで移動し終わるまではBUSY状態になります。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 * @param DIR 0-1	回転方向
	 * @param position	-2,097,152 - 2,097,151	目標位置
	 */
	goToDir(motorId: number, DIR: 0 | 1, position: number): void {
		this.sendOsc(this.host, this.port, "/goToDir", ["i", "i", "i"], [motorId, DIR, position]);
	}

	// ========== モータの回転 ==========

	/**
	 * スピードプロファイルに従って減速したのち、モータを励磁したまま停止します。モータが停止するまではBUSY状態になります。
	 * もともとHiZ状態だった場合は、停止したままモータが励磁します。
	 * サーボモードだった場合は解除されます。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	softStop(motorId: number): void {
		this.sendOsc(this.host, this.port, "/softStop", ["i"], [motorId]);
	}

	/**
	 * モータを即時停止し、励磁したままにします。モータが停止するまではBUSY状態になります。
	 * もともとHiZ状態だった場合は、停止したままモータが励磁します。
	 * サーボモードだった場合は解除されます。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	hardStop(motorId: number): void {
		this.sendOsc(this.host, this.port, "/hardStop", ["i"], [motorId]);
	}

	/**
	 * スピードプロファイルに従って減速したのち、モータを停止して励磁を解除します。励磁が解除されるとHiZ状態になります。モータが停止するまではBUSY状態になります。
	 * サーボモードだった場合は解除されます。
	 * 電磁ブレーキモードが有効になっている場合は、電磁ブレーキを保持状態にしてからHiZ状態に移行します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	softHiZ(motorId: number): void {
		this.sendOsc(this.host, this.port, "/softHiZ", ["i"], [motorId]);
	}

	/**
	 * モータを即時停止し、励磁を解除します。励磁が解除されるとHiZ状態になります。モータが停止するまではBUSY状態になります。
	 * サーボモードだった場合は解除されます。
	 * 電磁ブレーキモードが有効になっている場合は、電磁ブレーキを保持状態にしてからHiZ状態に移行します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	hardHiZ(motorId: number): void {
		this.sendOsc(this.host, this.port, "/hardHiZ", ["i"], [motorId]);
	}

	// -------------------------------------------------------------------------------------------
	// 電磁ブレーキ
	// https://ponoor.com/docs/step-series/osc-command-reference/brake/
	// -------------------------------------------------------------------------------------------

	/**
	 * 電磁ブレーキモードを有効・無効にします。 電磁ブレーキモードが有効になると、電磁ブレーキを開放しないままモータを回すコマンドを送ってもERROR_BRAKE_ENGAGEDエラーになります。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param enable 0-1	1:有効, 0:無効 (初期値: 0)
	 */
	enableElectromagnetBrake(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableElectromagnetBrake", ["i", "i"], [motorId, enable]);
	}
	/**
	 *
	 * 電磁ブレーキモードの場合に、モータの励磁、励磁解除を切り替えます。電磁ブレーキも連動して動作します。
	 * このコマンドでモータが励磁状態になっていないと、モータを回転させるコマンドを送ることはできません。
	 * 電磁ブレーキモードが無効の場合は無視されます。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param state 	0-1	1:励磁 0:励磁解除
	 */
	activate(motorId: number, state: BrakeState): void {
		this.sendOsc(this.host, this.port, "/activate", ["i", "i"], [motorId, state]);
	}

	/**
	 * 電磁ブレーキモードの場合に、モータ軸を開放します。モータの励磁を解除し、電磁ブレーキも解放のままになります。
	 * 負荷を吊り下げている場合は、保持力がなくなって負荷が落下する原因になりますので、送信時には十分注意してください。
	 * 電磁ブレーキモードが無効の場合は無視されます。
	 * @param motorId
	 */
	free(motorId: number): void {
		this.sendOsc(this.host, this.port, "/free", ["i"], [motorId]);
	}

	/**
	 * 電磁ブレーキの保持・開放時に、モータを励磁したままにしておく遷移時間を指定します。
	 * これは物理的にブレーキ機構が動作する時間がかかるため、ブレーキの動作が完了するまでモータ軸を保持しておくために必要な時間です。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param duration 0-10000 [ms]	遷移時間 (初期値: 100[ms])
	 */
	setBrakeTransitionDuration(motorId: number, duration: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setBrakeTransitionDuration",
			["i", "i"],
			[motorId, duration],
		);
	}

	/**
	 * 電磁ブレーキの保持・開放時に、モータを励磁したままにしておく遷移時間を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getBrakeTransitionDuration(motorId: number): Promise<BrakeTransitionDurationObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getBrakeTransitionDuration",
			["i"],
			[motorId],
			"/brakeTransitionDuration",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				duration: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			duration: data.args[1] as number,
		};
	}

	// -------------------------------------------------------------------------------------------
	// サーボモード
	// https://ponoor.com/docs/step-series/osc-command-reference/servo-mode/
	// -------------------------------------------------------------------------------------------

	/**
	 * サーボモード（位置追従モード）をオンオフします。急に動き出すことを避けるため、有効になった瞬間の現在位置が目標位置にセットされます。
	 * このモードで動作している間は、/runや/goTo など他のモータ制御コマンドを送ることはできません。
	 * 実行可能タイミング: BUSY解除時
	 * @param motorId
	 * @param enable 	0-1	1で有効, 0で無効
	 */
	enableServoMode(motorId: number, enable: ActivationStatus): void {
		this.sendOsc(this.host, this.port, "/enableServoMode", ["i", "i"], [motorId, enable]);
	}

	/**
	 * PID制御のゲインを調整します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param kP 0.0-	比例制御ゲイン (初期値: 0.06)
	 * @param kI 0.0-	積分制御ゲイン (初期値: 0.0)
	 * @param kD 0.0-	微分制御ゲイン (初期値: 0.0)
	 */
	setServoParam(motorId: number, kP: number, kI: number, kD: number): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setServoParam",
			["i", "f", "f", "f"],
			[motorId, kP, kI, kD],
		);
	}

	/**
	 * PID制御のゲインを取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 */
	async getServoParam(motorId: number): Promise<ServoParamObj | null> {
		const data = await this.sendOscWaitReceived(
			this.host,
			this.port,
			"/getServoParam",
			["i"],
			[motorId],
			"/servoParam",
			motorId,
		);
		if (!data) return null;
		if (motorId == 255) {
			return {
				motorID: 255,
				kP: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![1];
				}) as number[],
				kI: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![2];
				}) as number[],
				kD: (data.args as Array<Array<OscValue>>).map((item) => {
					return item![3];
				}) as number[],
			};
		}
		return {
			motorID: data.args[0] as MotorId,
			kP: data.args[1] as number,
			kI: data.args[2] as number,
			kD: data.args[3] as number,
		};
	}

	/**
	 * サーボモードの目標位置を設定します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param position  -2,097,152 - 2,097,151	目標位置
	 */
	setTargetPosition(motorId: number, position: number): void {
		this.sendOsc(this.host, this.port, "/setTargetPosition", ["i", "i"], [motorId, position]);
	}

	/**
	 * サーボモードの目標位置を取得します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param position [1-4/1-8]	-2,097,152 - 2,097,151	目標位置
	 */
	setTargetPositionList(motorId: number, positionList: number[]): void {
		this.sendOsc(
			this.host,
			this.port,
			"/setTargetPositionList",
			["i", "i"],
			[motorId, ...positionList],
		);
	}

	// -------------------------------------------------------------------------------------------
	// オリジナル
	// -------------------------------------------------------------------------------------------
	/**
	 * 事前に設定したスピードプロファイルに従って、指定角度分移動します。
	 * 指定角度分を移動し終わるまではBUSY状態になります。このコマンドはモータが停止していないと実行できません。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 */
	moveByAngle = (motorId: number, angle: number): void => {
		const motor = this.motors.find((motor) => motor.motorId === motorId);
		if (!motor) return;
		const steps = Math.round(angle / (motor.stepAngle / Math.pow(2, motor.microStepMode || 0)));
		this.move(motorId, steps);
	};
	/**
	 * 事前に設定したスピードプロファイルにしたがって、指定角度まで最短経路で移動します。指定角度まで移動し終わるまではBUSY状態になります。
	 * 実行可能タイミング: 動作開始条件時
	 * @param motorId
	 */
	goToByAngle = (motorId: number, angle: number): void => {
		const motor = this.motors.find((motor) => motor.motorId === motorId);
		if (!motor) return;
		const steps = Math.round(angle / (motor.stepAngle / Math.pow(2, motor.microStepMode || 0)));
		this.goTo(motorId, steps);
	};

	/**
	 * サーボモードの目標角度を設定します。
	 * 実行可能タイミング: 常時
	 * @param motorId
	 * @param angle
	 */
	setTargetPositionByAngle = (motorId: number, angle: number): void => {
		const motor = this.motors.find((motor) => motor.motorId === motorId);
		if (!motor) return;
		const steps = Math.round(angle / (motor.stepAngle / Math.pow(2, motor.microStepMode || 0)));
		this.setTargetPosition(motorId, steps);
	};
}
