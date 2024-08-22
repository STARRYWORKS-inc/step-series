import osc from "osc";
import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from "electron";

/**
 * OSC通信をハンドリングするクラス
 */
export class OscHandler {
	mainWindow: BrowserWindow;
	udpPorts: osc.UDPPort[] = [];
	ready: boolean = false;
	destroyed: boolean = false;

	/**
	 * コンストラクタ
	 * @param mainWindow
	 */
	constructor(mainWindow: BrowserWindow) {
		this.mainWindow = mainWindow;
		for (let i = 0; i < 8; i++) {
			const udpPort = new osc.UDPPort({
				localPort: 50101 + i,
				metadata: true,
				broadcast: true,
			});
			udpPort.options.localAddress = undefined; // osc.jsのバグ回避。これにより全てのアドレス宛のメッセージを受信する
			udpPort.on("message", this.#onReceive);
			udpPort.open();
			udpPort.on("ready", () => {
				this.ready = true;
			});
			this.udpPorts.push(udpPort);
		}
		ipcMain.handle("OscSend", this.#onSend);
	}

	/**
	 * 破棄処理
	 */
	dispose(): void {
		this.ready = false;
		this.destroyed = true;
		this.udpPorts.forEach((udpPort) => {
			udpPort.off("message", this.#onReceive);
			udpPort.close();
		});
		ipcMain.removeHandler("OscSend");
	}

	/**
	 * 受信したOSCメッセージをフロント側に受け渡す
	 * @param message
	 */
	#onReceive = (oscMsg): void => {
		if (this.destroyed) return;
		const address = oscMsg.address;
		const values: (number | string | Blob | null)[] = [];
		oscMsg.args.map((arg) => {
			values.push(arg.value);
		});
		this.mainWindow.webContents.send("OscReceived", address, values);
	};

	/**
	 * フロント側からのOSCメッセージ送信を処理する
	 * @param _
	 * @param host
	 * @param port
	 * @param address
	 * @param values
	 */
	#onSend = (
		_: IpcMainInvokeEvent,
		host: string,
		port: number,
		address: string,
		types: string[],
		values: string[] | number[],
	): void => {
		if (this.destroyed || !this.ready) return;
		const args: { type: string; value: number | string | boolean | Blob }[] = [];
		for (let i = 0; i < types.length && i < values.length; i++) {
			args.push({
				type: types[i],
				value: values[i],
			});
		}
		console.log("OSC Send ---");
		console.log({ address, args, host, port });
		this.udpPorts[0].send({ address, args }, host, port);
	};
}
