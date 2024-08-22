interface Information {
	configName: string;
	configVersion: number[];
	targetProduct: string;
}

interface Network {
	myIp: number[];
	isMyIpAddId: boolean;
	destIp: number[];
	dns: number[];
	gateway: number[];
	subnet: number[];
	inPort: number;
	outPort: number;
	isOutPortAddId: boolean;
	mac: number[];
	isMacAddId: boolean;
	bootedMsgEnable: boolean;
	canSendMsgBeforeDestIp: boolean;
	reportError: boolean;
}

interface AlarmAndReport {
	reportBUSY: boolean[];
	reportHiZ: boolean[];
	reportHomeSwStatus: boolean[];
	reportDir: boolean[];
	reportMotorStatus: boolean[];
	reportSwEvn: boolean[];
	reportUVLO: boolean[];
	reportThermalStatus: boolean[];
	reportOCD: boolean[];
	reportStall: boolean[];
	reportPositionInterval: number[];
	reportPositionListInterval: number;
	OCThreshold: number[];
}

interface DriverSettings {
	homingAtStartup: boolean[];
	homingDirection: number[];
	homingSpeed: number[];
	homeSwMode: boolean[];
	prohibitMotionOnHomeSw: boolean[];
	goUntilTimeout: number[];
	releaseSwTimeout: number[];
	stepMode: number[];
	electromagnetBrakeEnable: boolean[];
	brakeTransitionDuration: number[];
}

interface SpeedProfile {
	acc: number[];
	dec: number[];
	maxSpeed: number[];
	fullStepSpeed: number[];
	minSpeed: number[];
}

interface VoltageMode {
	KVAL_HOLD: number[];
	KVAL_RUN: number[];
	KVAL_ACC: number[];
	KVAL_DEC: number[];
	INT_SPEED: number[];
	ST_SLP: number[];
	FN_SLP_ACC: number[];
	FN_SLP_DEC: number[];
	STALL_TH: number[];
	lowSpeedOptimizeEnable: boolean[];
	lowSpeedOptimize: number[];
}

interface ServoMode {
	kP: number[];
	kI: number[];
	kD: number[];
}

export interface ConfigJson {
	information: Information;
	network: Network;
	alarmAndReport: AlarmAndReport;
	driverSettings: DriverSettings;
	speedProfile: SpeedProfile;
	voltageMode: VoltageMode;
	servoMode: ServoMode;
}
