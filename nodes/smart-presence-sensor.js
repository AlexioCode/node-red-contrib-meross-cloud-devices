const MerossCloud = require('@kronsi/meross-cloud');
function isSmartPresenceSensor(deviceType) {
	return deviceType == "ms600";
}

module.exports = function (RED) {
	'use strict';

	function SmartPresenceSensorNode(node) {
		RED.nodes.createNode(this, node);
		this.config = RED.nodes.getNode(node.confignode);
		let meross = null;
		//if(deviceDefList.length == 0){


		//internal server error
		/*

		if(this.config.username.length > 0 && this.config.password.length >0 &&){
			const options = {
				email: this.config.username,
				password: this.config.password,
				logger: console.log,
				localHttpFirst: false, // Try to contact the devices locally before trying the cloud
				onlyLocalForGet: true, // When trying locally, do not try the cloud for GET requests at all
				timeout: 3000 // Default is 3000
			};			
			const meross =new MerossCloud(options);
			
			//console.log("meross", meross)
		}
		
		meross.on('deviceInitialized', (deviceId, deviceDef, device) => {	
			deviceDefList.push(deviceDef);
			deviceList.push(device);
			console.log('New device ' + deviceId + ': ' , deviceDef);
			//console.warn('device: ', device);					
		});
		meross.on('connected', (deviceId) => {
			console.log(deviceId + ' connected');
		});
		
		meross.on('close', (deviceId, error) => {
			console.log(deviceId + ' closed: ' + error);
		});
		
		meross.on('error', (deviceId, error) => {
			console.log(deviceId + ' error: ' + error);
		});
		
		meross.on('reconnect', (deviceId) => {
			console.log(deviceId + ' reconnected');
		});
		
		meross.on('data', (deviceId, payload) => {
			console.log(deviceId + ' data: ', payload);
		});

		meross.connect(node.device,(error) => {
			console.log('connect error: ' + error);
		});
		*/
		//}

		let currentDevices = [];

		this.on('input', (msg, send) => {
			//console.log("node", node);
			//console.log("msg", msg);

			function pushMessage(_devices) {
				let messages = [];
				let called = 0;
				//console.log("_devices.length", _devices.length);

				function call() {
					called++;
					if (called == _devices.length) {
						send(messages);
					}
				}
				for (let i = 0; i < _devices.length; i++) {
					switch (node.action) {
						case 'state':
							_devices[i].getSystemAllData((err, res) => {
								if (err)
									console.error("Error trying to invoke getSystemAllData function", err);

								const payloadData = {
									deviceName: _devices[i].dev.devName,
									deviceDetails: _devices[i].dev,
								};
								// Verify if res.all is available
								if (res && res.all)
									Object.assign(payloadData, res.all);
								else
									console.warn("'res.all' is not available");

								messages.push({ payload: payloadData });

								call();
							});
							break;

						case 'abilities':
							_devices[i].getSystemAbilities((err, res) => {
								if (err)
									console.error("Error trying to invoke getSystemAbilities function", err);

								if (res && res.ability) {
									messages.push(
										{
											payload: {
												deviceName: _devices[i].dev.devName,
												deviceDetails: _devices[i].dev,
												ability: res.ability
											}
										}
									);
								}

								call();
							});
							break;

					} // Switch end
				} // for end
			} // pushMessage(_devices) end


			// Meross Cloud Initialization
			//console.log("meross", meross);
			if (!meross) {
				if (this.config.username.length > 0 && this.config.password.length > 0) {
					const options = {
						email: this.config.username,
						password: this.config.password,
						logger: console.log,
						localHttpFirst: false, // Try to contact the devices locally before trying the cloud
						onlyLocalForGet: true, // When trying locally, do not try the cloud for GET requests at all
						timeout: 3000 // Default is 3000
					};
					meross = new MerossCloud(options);


					// Meross event handlers
					meross.on('deviceInitialized', (deviceId, deviceDef, device) => {
						//console.log('deviceInitialized' + deviceId + ': ' , deviceDef);
						if (isSmartPresenceSensor(deviceDef.deviceType)) {
							currentDevices.push(device);
						}
						else {
							// console.log('deviceInitialized' + deviceId + ': ' , deviceDef);
						}
						//console.warn('device: ', device);					
					});

					meross.on('close', (deviceId, error) => {
						//console.log(deviceId + ' closed: ' + error);
						this.status({ fill: "red", shape: "dot", text: "closed" });
					});

					meross.on('error', (deviceId, error) => {
						//console.log(deviceId + ' error: ' + error);
						this.status({ fill: "red", shape: "dot", text: "error" });
					});

					//experimental
					meross.on('data', (deviceId, payload) => {
						console.log(deviceId + ' data: ', payload);
					});


					// Connection to the Meross devices
					meross.connect(node.device.split(","), (error) => {
						if (error) {
							console.log('connect error: ' + error);
						}
						this.status({ fill: "yellow", shape: "dot", text: "connecting..." });
						if (!error) {
							setTimeout(() => {
								this.status({ fill: "green", shape: "dot", text: "connected" });
								pushMessage(currentDevices);
							}, 1500)
						}
						else {
							setTimeout(() => {
								this.status({ fill: "red", shape: "dot", text: "not connected, connection err" });
							}, 1500)
						}
					});
				}
				else {
					// If credentials aren't entered (username and password)
					//send 401 not auth message
					console.error("401");
					this.status({ fill: "red", shape: "dot", text: "Unauthorized" });
				}
			}


			// Messages sending	if there are connected devices
			if (currentDevices && currentDevices.length > 0) {
				pushMessage(currentDevices);
			}
			else {
				//send device not loaded
				console.error("currentDevice null");
				this.status({ fill: "red", shape: "dot", text: "Device Not Found" });
				//try again, next step
				currentDevices = [];
				meross = null;
			}

			//done();

		});

	}

	RED.nodes.registerType('meross-smart-presence-sensor', SmartPresenceSensorNode);

	// HTTP endpoint to obtain the list of devices
	RED.httpAdmin.get(
		"/smart-presence-sensor_devices/:nodeid",
		RED.auth.needsPermission("meross-smart-presence-sensor.write"),
		function (req, res) {
			const node = RED.nodes.getNode(req.params.nodeid);
			if (node) {
				//process.exit();//node.config.username
				let devList = [];
				if (node.config.username.length > 0 && node.config.password.length > 0) {
					const options = {
						email: node.config.username,
						password: node.config.password,
						logger: console.log,
						localHttpFirst: false, // Try to contact the devices locally before trying the cloud
						onlyLocalForGet: true, // When trying locally, do not try the cloud for GET requests at all
						timeout: 3000 // Default is 3000
					};
					const meross = new MerossCloud(options);
					node.status({ fill: "green", shape: "dot", text: "connected" });

					if (devList.length == 0) {
						meross.on('deviceInitialized', (deviceId, deviceDef, device) => {
							//console.log('deviceInitialized ' + deviceId + ': ' , deviceDef);
							if (isSmartPresenceSensor(deviceDef.deviceType)) {
								devList.push(deviceDef);
							}
							else {
								//console.log('deviceInitialized' + deviceId + ': ' , deviceDef);
							}
							//console.log('New device ' + deviceId + ': ' , deviceDef);
							//console.log("devicelist.length", devList.length, devCounter)							
						});

						meross.connect((error) => {
							console.log('connect error: ' + error);
							let deviceCounter = 0;
							for (let key in meross.devices) {
								if (isSmartPresenceSensor(meross.devices[key].dev.deviceType)) {
									deviceCounter++;
								}
							}
							if (deviceCounter == devList.length) {
								res.json(devList);
								//meross.logout();
							}
						});
					}
					else {
						res.json(devList);
					}
				}
				else {
					res.sendStatus(401);
					node.status({ fill: "red", shape: "ring", text: "Unauthorized" });
				}
			}
			else {
				res.sendStatus(404);
				node.status({ fill: "red", shape: "ring", text: "Not Found" });
			}
		}
	)
};