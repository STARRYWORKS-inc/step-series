import { Pane } from "tweakpane";
import { Step400, Step800, MicroStepMode } from "@starryworks_inc/step-series/";
import { BindingApi } from "@tweakpane/core";

interface ParamsObj {
	oscMessage: string;
	dataPreview: string;
	motors: MotorSettingObj[];
}

interface MotorSettingObj {
	motorId: number;
	microStepMode: MicroStepMode;
	holdKVAL: number;
	runKVAL: number;
	accKVAL: number;
	setDecKVAL: number;
	speedProfileAcc: number;
	speedProfileDec: number;
	speedProfileMaxSpeed: number;
	homingSpeed: number;
	homingDirection: number;
	homeSwMode: number;
	ranSpeed: number;
	moveStep: number;
	moveRotation: number;
	gotoStep: number;
	gotoRotation: number;
	servoMode: boolean;
	servoTargetStep: number;
	servoTargetRotation: number;
}

export class StepSeriesGui {
	params: ParamsObj = {
		oscMessage: "",
		dataPreview: "",
		motors: [],
	};

	pane: Pane;
	allGotoStep: number = 0;
	constructor(step: Step400 | Step800, index: number = 0) {
		this.pane = new Pane({ title: `step - ${step.id}` });
		this.setup(step);
		const paneElement = document.getElementsByClassName("tp-dfwv")[index] as HTMLElement;
		paneElement.style.position = "absolute";
		paneElement.style.top = "0px";
		paneElement.style.left = `${260 * index}px`;
	}

	async setup(step: Step400 | Step800): Promise<void> {
		step.addListener(step.OSC_RECEIVED, (address, args) => {
			this.params.oscMessage = `address: ${address}\nargs:\n${args.join("\n")}\n`;
		});

		for (let i = 0; i < step.motors.length; i++) {
			this.params.motors.push({
				motorId: i,
				microStepMode: MicroStepMode.msFull,
				holdKVAL: 80,
				runKVAL: 160,
				accKVAL: 160,
				setDecKVAL: 160,
				speedProfileAcc: 2000,
				speedProfileDec: 2000,
				speedProfileMaxSpeed: 620,
				homingSpeed: 100,
				homingDirection: 0,
				homeSwMode: 1,
				ranSpeed: 0,
				moveStep: 0,
				moveRotation: 0,
				gotoStep: 0,
				gotoRotation: 0,
				servoMode: false,
				servoTargetStep: 0,
				servoTargetRotation: 0,
			});
		}
		this.init(step);
	}

	init(step: Step400 | Step800): void {
		// message
		const messageFolder = this.pane.addFolder({ title: "Message" });
		messageFolder.addBinding(this.params, "oscMessage", {
			readonly: true,
			multiline: true,
			rows: 6,
		}) as BindingApi<string>;
		messageFolder.addBinding(this.params, "dataPreview", {
			readonly: true,
			multiline: true,
			rows: 6,
		}) as BindingApi<string>;

		const allGotoStepFolder = this.pane.addFolder({ title: "All Go To", expanded: true });
		allGotoStepFolder.addBinding(this, "allGotoStep", {
			min: -100000,
			max: 100000,
			step: 1,
			label: "Step",
		});
		allGotoStepFolder.addButton({ title: "All Go To" }).on("click", () => {
			step.goTo(255, this.allGotoStep);
		});

		this.pane.addButton({ title: "ALL Soft stop" }).on("click", () => {
			step.softStop(255);
		});
		this.pane.addButton({ title: "ALL Hard stop" }).on("click", () => {
			step.hardStop(255);
		});
		// motors
		const motorFolder = this.pane.addFolder({ title: "Motors" });
		this.pane.addBlade({ view: "separator" });
		const pages: { title: string }[] = [];
		step.motors.forEach((motor) => {
			pages.push({ title: `${motor.motorId}` });
		});
		const tabPage = motorFolder.addTab({ pages });
		step.motors.forEach((motor, i) => {
			const index = i;
			const motorId = motor.motorId;
			const parent = tabPage.pages[index];

			// basic -----------------
			const basicFolder = parent.addFolder({ title: "Basic Settings", expanded: false });
			basicFolder.addBinding(this.params.motors[index], "holdKVAL", {
				min: 0,
				max: 255,
				step: 1,
			});
			basicFolder.addBinding(this.params.motors[index], "runKVAL", {
				min: 0,
				max: 255,
				step: 1,
			});
			basicFolder.addBinding(this.params.motors[index], "accKVAL", {
				min: 0,
				max: 255,
				step: 1,
			});
			basicFolder.addBinding(this.params.motors[index], "setDecKVAL", {
				min: 0,
				max: 255,
				step: 1,
			});
			basicFolder.addButton({ title: "Set KVal" }).on("click", async () => {
				const motor = this.params.motors[index];
				await step.setKval(motorId, motor.holdKVAL, motor.runKVAL, motor.accKVAL, motor.setDecKVAL);
			});
			basicFolder.addButton({ title: "Get KVal" }).on("click", async () => {
				const data = await step.getKval(motorId);
				this.params.dataPreview = `Get KVal \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `holdKVAL: ${data!.holdKVAL.toString()}\n`;
				this.params.dataPreview += `runKVAL: ${data!.runKVAL.toString()}\n`;
				this.params.dataPreview += `accKVAL: ${data!.accKVAL.toString()}\n`;
				this.params.dataPreview += `setDecKVAL: ${data!.setDecKVAL.toString()}`;
			});
			basicFolder.addBlade({ view: "separator" });
			basicFolder.addBinding(this.params.motors[index], "speedProfileAcc", {
				min: 14.55,
				max: 59590,
				step: 1,
				label: "acc",
			});
			basicFolder.addBinding(this.params.motors[index], "speedProfileDec", {
				min: 14.55,
				max: 59590,
				step: 1,
				label: "dec",
			});
			basicFolder.addBinding(this.params.motors[index], "speedProfileMaxSpeed", {
				min: 15.25,
				max: 15610,
				step: 1,
				label: "maxSpeed",
			});
			basicFolder.addButton({ title: "Set Speed Profile" }).on("click", async () => {
				const motor = this.params.motors[index];
				step.setSpeedProfile(
					motorId,
					motor.speedProfileAcc,
					motor.speedProfileDec,
					motor.speedProfileMaxSpeed,
				);
			});
			basicFolder.addButton({ title: "Get Speed Profile" }).on("click", async () => {
				const data = await step.getSpeedProfile(motorId);
				this.params.dataPreview = `Get Speed Profile \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `acc: ${data!.acc.toString()}\n`;
				this.params.dataPreview += `dec: ${data!.dec.toString()}\n`;
				this.params.dataPreview += `maxSpeed: ${data!.maxSpeed.toString()}`;
			});
			basicFolder.addBlade({ view: "separator" });
			basicFolder.addBinding(this.params.motors[index], "microStepMode", {
				min: 0,
				max: 7,
				step: 1,
				label: "Micro Step Mode",
			});
			basicFolder.addButton({ title: "Set Micro Step Mode" }).on("click", async () => {
				step.setMicroStepMode(motorId, this.params.motors[index].microStepMode);
			});
			basicFolder.addButton({ title: "Get Micro Step Mode" }).on("click", async () => {
				step.getMicroStepMode(motorId);
			});

			// homing -----------------
			const homingFolder = parent.addFolder({ title: "Homing Settings", expanded: false });
			homingFolder.addButton({ title: "Homing" }).on("click", () => {
				step.homing(motorId);
			});
			homingFolder.addBlade({ view: "separator" });
			homingFolder.addBinding(this.params.motors[index], "homingSpeed", {
				min: 0,
				max: 500,
				step: 1,
				label: "Speed",
			});
			homingFolder.addButton({ title: "Set Homing Speed" }).on("click", () => {
				step.setHomingSpeed(motorId, this.params.motors[index].homingSpeed);
			});
			homingFolder.addButton({ title: "Get Homing Speed" }).on("click", async () => {
				const data = await step.getHomingSpeed(motorId);
				this.params.dataPreview = `Get Homing Speed \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `homingSpeed: ${data!.homingSpeed.toString()}`;
			});
			homingFolder.addBlade({ view: "separator" });
			homingFolder.addBinding(this.params.motors[index], "homingDirection", {
				min: 0,
				max: 1,
				step: 1,
				label: "Direction",
			});
			homingFolder.addButton({ title: "Set Homing Direction" }).on("click", () => {
				step.setHomingDirection(motorId, this.params.motors[index].homingDirection as 0 | 1);
			});
			homingFolder.addButton({ title: "Get Homing Direction" }).on("click", async () => {
				const data = await step.getHomingDirection(motorId);
				this.params.dataPreview = `Get Homing Status \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `homingDirection: ${data!.homingDirection.toString()}`;
			});
			homingFolder.addBlade({ view: "separator" });
			homingFolder.addBinding(this.params.motors[index], "homeSwMode", {
				min: 0,
				max: 1,
				step: 1,
				label: "Sw Mode",
			});
			homingFolder.addButton({ title: "Set Homing Sw Mode" }).on("click", async () => {
				const data = await step.getHomeSwMode(motorId);
				this.params.dataPreview = `Get Homing Speed \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `homingSpeed: ${data!.swMode.toString()}`;
			});
			homingFolder.addButton({ title: "Get Homing Sw Mode" }).on("click", async () => {
				const data = await step.getHomeSwMode(motorId);
				this.params.dataPreview = `Get Homing Speed \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `homingSpeed: ${data!.swMode.toString()}`;
			});
			homingFolder.addBlade({ view: "separator" });
			homingFolder.addButton({ title: "Get Homing Status" }).on("click", async () => {
				const data = await step.getHomingStatus(motorId);
				this.params.dataPreview = `Get Homing Status \n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `homingStatus: ${data!.homingStatus.toString()}`;
			});

			// run -----------------
			const runAndStopFolder = parent.addFolder({ title: "Run", expanded: false });
			runAndStopFolder.addBinding(this.params.motors[index], "ranSpeed", {
				min: -1000,
				max: 1000,
				step: 1,
				label: "Speed",
			});
			runAndStopFolder.addButton({ title: "Run" }).on("click", () => {
				step.run(motorId, this.params.motors[index].ranSpeed);
			});
			// move -----------------
			const moveAndStopFolder = parent.addFolder({ title: "Move", expanded: false });
			moveAndStopFolder.addBinding(this.params.motors[index], "moveStep", {
				min: -1000,
				max: 1000,
				step: 1,
				label: "Step",
			});
			moveAndStopFolder.addButton({ title: "Move" }).on("click", () => {
				step.move(motorId, this.params.motors[index].ranSpeed);
			});
			moveAndStopFolder.addBlade({ view: "separator" });
			moveAndStopFolder.addBinding(this.params.motors[index], "moveRotation", {
				min: -360,
				max: 360,
				step: 1,
				label: "Rotation",
			});
			moveAndStopFolder.addButton({ title: "Move By Angle" }).on("click", () => {
				step.run(motorId, this.params.motors[index].moveRotation);
			});
			// move -----------------
			const goToAndStopFolder = parent.addFolder({ title: "Go To", expanded: false });
			goToAndStopFolder.addBinding(this.params.motors[index], "gotoStep", {
				min: -100000,
				max: 100000,
				step: 1,
				label: "Step",
			});
			goToAndStopFolder.addButton({ title: "Go To" }).on("click", () => {
				step.goTo(motorId, this.params.motors[index].gotoStep);
			});
			goToAndStopFolder.addBlade({ view: "separator" });
			goToAndStopFolder.addBinding(this.params.motors[index], "gotoRotation", {
				min: -360,
				max: 360,
				step: 1,
				label: "Rotation",
			});
			goToAndStopFolder.addButton({ title: "Go To By Angle" }).on("click", () => {
				step.goToByAngle(motorId, this.params.motors[index].gotoRotation);
			});

			// servo mode -----------------
			const servoModeFolder = parent.addFolder({ title: "Servo Mode", expanded: false });
			servoModeFolder
				.addBinding(this.params.motors[index], "servoMode", { label: "Enabled" })
				.on("change", () => {
					step.enableServoMode(motorId, this.params.motors[index].servoMode ? 1 : 0);
				});
			servoModeFolder.addButton({ title: "Get Servo Param" }).on("click", async () => {
				const data = await step.getServoParam(motorId);
				this.params.oscMessage = data!.toString();
				this.params.dataPreview = `Get Servo Param\n`;
				this.params.dataPreview += `motorId: ${motorId} \n`;
				this.params.dataPreview += `kP: ${data!.kP.toString()}\n`;
				this.params.dataPreview += `kI: ${data!.kI.toString()}\n`;
				this.params.dataPreview += `kD: ${data!.kD.toString()}`;
			});
			servoModeFolder.addBlade({ view: "separator" });
			servoModeFolder.addBinding(this.params.motors[index], "servoTargetStep", {
				min: -100000,
				max: 100000,
				step: 0.25,
				label: "Step",
			});
			servoModeFolder.addButton({ title: "Set Target Position" }).on("click", () => {
				step.setTargetPosition(motorId, this.params.motors[index].servoTargetStep);
			});
			servoModeFolder.addBlade({ view: "separator" });
			servoModeFolder.addBinding(this.params.motors[index], "servoTargetRotation", {
				min: -360,
				max: 360,
				step: 1,
				label: "Rotation",
			});
			servoModeFolder.addButton({ title: "Set Target Rotation" }).on("click", () => {
				step.setTargetPositionByAngle(motorId, this.params.motors[index].servoTargetRotation);
			});

			parent.addButton({ title: "Soft stop" }).on("click", () => {
				step.softStop(motorId);
			});
			parent.addButton({ title: "Hard stop" }).on("click", () => {
				step.hardStop(motorId);
			});
		});
	}
}
