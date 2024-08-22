import { OverCurrentDetectionThreshold_Step800, StallThreshold_Step800 } from "./data/enums";
import StepSeries from "./stepSeries";

/**
 * step800
 */
export default class Step800 extends StepSeries {
	readonly STEP_800 = "step800";
	stepType: string = this.STEP_800;
	motorMaxCount: number = 8;

	// -------------------------------------------------------------------------------------------
	// 設定値が異なるコマンド
	// -------------------------------------------------------------------------------------------
	/**
	 * @param threshold 0-15	375mA-6A (初期値: 7 (3A))
	 */
	setOverCurrentThreshold(motorId: number, threshold: OverCurrentDetectionThreshold_Step800): void {
		if (threshold < 0 || threshold > 15)
			throw new Error("threshold value must be between 0 and 15");
		super.setOverCurrentThreshold(motorId, threshold);
	}

	/**
	 * @param stall_th 0-127 31.25mA-4A (初期値: 127 (4A))
	 */
	setStallThreshold(motorId: number, stall_th: StallThreshold_Step800): void {
		if (stall_th < 0 || stall_th > 127) throw new Error("stall_th value must be between 0 and 127");
		super.setStallThreshold(motorId, stall_th);
	}
}
