import { Osc } from "./osc";
import { Step800 } from "@starryworks/step-series";
import * as motorConfig from "./config.json";
import { StepSeriesGui } from "./stepSeriesGui";

class App {
	step800List: Step800[] = [];
	stepSeriesGuiList: StepSeriesGui[] = [];

	constructor() {
		Osc.on(Osc.MESSAGE, this.onOscReceived);
		for (let i = 0; i < 3; i++) {
			const boardId = i + 1;
			const useMotorIds = [1, 2, 3, 4, 5, 6, 7, 8];
			const step = new Step800();
			step.setup(boardId, useMotorIds, this.sendOsc, motorConfig);
			this.step800List.push(step);
			this.stepSeriesGuiList.push(new StepSeriesGui(step, i));
		}
	}

	sendOsc: (
		host: string,
		port: number,
		address: string,
		types: string[],
		args: (string | number | boolean | null | Blob)[],
	) => void = (host, port, address, types, args) => {
		Osc.send(host, port, address, types, args);
	};

	onOscReceived = (
		host: string,
		address: string,
		args: (number | string | Blob | null)[],
	): void => {
		if (host) {
			const id = host.split(".")[3];
			for (const step of this.step800List) {
				if (id == step.id.toString()) step.oscReceived(address, args);
			}
		}
	};
}

function init(): void {
	window.addEventListener("DOMContentLoaded", () => new App());
}

init();
