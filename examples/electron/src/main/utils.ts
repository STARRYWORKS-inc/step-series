import os from "os";

type IPAddresses = {
	ipv4: { name: string; address: string }[];
	ipv6: { name: string; address: string }[];
};

export const getPreferredLocalAddress = (startWith: string): string => {
	const ipAddresses = getLocalAddress().ipv4;
	// startWithで始まるIPアドレスを優先して取得 (なければ最初のIPアドレスを使用)
	const localIP =
		ipAddresses.length < 1
			? "localhost"
			: ipAddresses.find((ip) => ip.address.startsWith(startWith))?.address ??
				ipAddresses[0].address;
	return localIP;
};

/**
 * 自分のIPアドレスを取得
 * @returns
 */
export const getLocalAddress = (): IPAddresses => {
	const interfaces = os.networkInterfaces();
	const results: IPAddresses = { ipv4: [], ipv6: [] };

	for (const dev in os.networkInterfaces()) {
		interfaces[dev]!.forEach((details) => {
			if (!details.internal) {
				switch (details.family) {
					case "IPv4":
						results.ipv4.push({ name: dev, address: details.address });
						break;
					case "IPv6":
						results.ipv6.push({ name: dev, address: details.address });
						break;
				}
			}
		});
	}
	return results;
};
