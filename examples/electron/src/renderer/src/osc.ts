import { IpcRendererEvent } from "electron";
import { EventEmitter } from "events";

class _Osc extends EventEmitter {
	MESSAGE: string = "message";

	constructor() {
		super();
		window.electron.ipcRenderer.on("OscReceived", this.onOscReceived);
	}

	/**
	 * OSCメッセージ受信時の処理
	 * @param _
	 * @param message
	 */
	onOscReceived = (
		_: IpcRendererEvent,
		host: string,
		address: string,
		args: (number | string | Blob | null)[],
	): void => {
		this.emit(this.MESSAGE, host, address, args);
	};

	/**
	 * OSCメッセージを送信する
	 * @param address
	 * @param values
	 */
	send(
		host: string,
		port: number,
		address: string,
		types: string[],
		values: (number | string | boolean | null | Blob)[],
	): void {
		// ElectronのIPCでメインプロセスにOSCメッセージを送信する
		window.electron.ipcRenderer.invoke("OscSend", host, port, address, types, values);
	}
}

export const Osc = new _Osc();
