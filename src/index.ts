export { default as Step800 } from './step800';
export { default as Step400 } from './step400';
export { default as Motor } from './motor';
export { default as StepSeries } from './stepSeries';
import { StallThreshold_Step400, StallThreshold_Step800 } from './data/enum/stallThreshold';
import { OverCurrentDetectionThreshold_Step400, OverCurrentDetectionThreshold_Step800 } from './data/enum/overCurrentDetectionThreshold';
import { ACT, ActivationStatus, BrakeState, DestIpChanged, Direction, HomingStatus, MicroStepMode, MotorStatus, SwMode, SwState, ThermalStatus, UvloStatus } from './data/enums';
import { Tval } from './data/enum/tval';

const stepSeries = {
	OverCurrentDetectionThreshold_Step400,
	OverCurrentDetectionThreshold_Step800,
	StallThreshold_Step400,
	StallThreshold_Step800,
	UvloStatus,
	ThermalStatus,
	DestIpChanged,
	MicroStepMode,
	MotorStatus,
	Tval,
	HomingStatus,
	ACT,
	SwState,
	SwMode,
	BrakeState,
	Direction,
	ActivationStatus,
};


export {
  stepSeries as default,
	OverCurrentDetectionThreshold_Step400,
	OverCurrentDetectionThreshold_Step800,
	StallThreshold_Step400,
	StallThreshold_Step800,
	UvloStatus,
	ThermalStatus,
	DestIpChanged,
	MicroStepMode,
	MotorStatus,
	Tval,
	HomingStatus,
	ACT,
	SwState,
	SwMode,
	BrakeState,
	Direction,
	ActivationStatus,
}
