export default class Motor {
	motorId: number;
	//
	stepAngle = 1.8; // ステップ角
	microStepMode = 7; // マイクロステップモード
	// 各状態
	busy = 0; // 1:BUSYの場合, 0:BUSYでない場合
	HiZ = 0; // 1:HiZ状態の場合, 0:HiZ状態でない場合 ※ Hiz == （ハイインピーダンス）
	dir = 0; // 1:正転方向, 0:逆転方向
	motorStatus = 0; // 0:モータ停止 , 1:加速中, 2: 減速中, 3:	一定速運転中
	homingStatus = 0; // 0:ホームポジションに到達していない, 1:ホームポジションに到達している
	position_ABS_POS = 0; // -2,097,152 - 2,097,151	現在位置]

	/**
	 * constructor
	 * @param motorId
	 */
	constructor(motorId: number, stepAngle: number) {
		this.motorId = Math.floor(motorId);
		this.stepAngle = stepAngle;
	}

	/**
	 * oscReceived
	 * @param address
	 * @param message
	 */
	oscReceived = (address: string, args: (string | number | boolean | null | Blob)[]): void => {
		// -------------------------------------------------------------------------------------------
		// 自動送信されるメッセージ
		// https://ponoor.com/docs/step-series/osc-command-reference/automatically-sent-messages-from-step-400/
		// -------------------------------------------------------------------------------------------
		if (args[0] != this.motorId) return; // モーターID関係判定
		switch (address) {
			case "/busy":
				this.busy = args[1] as 0 | 1;
				break;
			case "/HiZ":
				this.HiZ = args[1] as 0 | 1;
				break;
			case "/dir":
				this.dir = args[1] as 0 | 1;
				break;
			case "/motorStatus":
				this.motorStatus = args[1] as 0 | 1 | 2 | 3;
				break;
			case "/homingStatus":
				this.homingStatus = args[1] as 0 | 1;
				break;
			case "/position":
				this.position_ABS_POS = args[1] as number;
				break;
			case "/positionList":
				if (args[this.motorId]) this.position_ABS_POS = args[this.motorId] as number;
				break;
		}
	};
}
