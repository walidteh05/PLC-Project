"""Flask gateway between the web HMI and Mitsubishi MX Component."""

import atexit
import re
import struct

if struct.calcsize("P") * 8 != 32:
    raise RuntimeError(
        "MX Component requires 32-bit Python. Run this server with a 32-bit Python interpreter."
    )

import pythoncom
import win32com.client
from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            # Next.js uses the next available port when 3000 is occupied.
            # Allow only loopback development origins, regardless of that port.
            "origins": r"^https?://(localhost|127\.0\.0\.1):\d+$"
        }
    },
)

LOGICAL_STATION_NUMBER = 1
IO_POINT_COUNT = 8
Y_DEVICE_PATTERN = re.compile(r"^Y[0-7]$")


class MxGateway:
    """Keep one COM connection alive to avoid exhausting the simulator socket."""

    def __init__(self):
        self.plc = None
        self.com_initialized = False

    def connect(self):
        if self.plc is not None:
            return self.plc

        pythoncom.CoInitialize()
        self.com_initialized = True
        plc = win32com.client.Dispatch("ActUtlType.ActUtlType.1")
        plc.ActLogicalStationNumber = LOGICAL_STATION_NUMBER
        result = plc.Open()

        if result != 0:
            del plc
            pythoncom.CoUninitialize()
            self.com_initialized = False
            raise RuntimeError(
                f"MX Component Open failed with code {result} (0x{result:08X})"
            )

        self.plc = plc
        return self.plc

    def close(self):
        if self.plc is not None:
            try:
                self.plc.Close()
            finally:
                self.plc = None

        if self.com_initialized:
            pythoncom.CoUninitialize()
            self.com_initialized = False

    def read_device_group(self, prefix: str):
        plc = self.connect()
        devices = []

        for index in range(IO_POINT_COUNT):
            device = f"{prefix}{index}"
            result, value = plc.GetDevice(device)

            if result != 0:
                raise RuntimeError(f"GetDevice {device} failed with code {result}")

            devices.append({"device": device, "value": int(value)})

        return devices


gateway = MxGateway()
atexit.register(gateway.close)


@app.get("/api/status")
def connection_status():
    return jsonify(
        connected=gateway.plc is not None,
        logical_station=LOGICAL_STATION_NUMBER,
    )


@app.post("/api/connect")
def connect_plc():
    try:
        gateway.connect()
        return jsonify(
            connected=True,
            logical_station=LOGICAL_STATION_NUMBER,
            message="Connected to GX Simulator via MX Component",
        )
    except Exception as error:
        return jsonify(error=str(error)), 500


@app.post("/api/disconnect")
def disconnect_plc():
    try:
        gateway.close()
        return jsonify(connected=False, message="Disconnected from PLC")
    except Exception as error:
        return jsonify(error=str(error)), 500


@app.get("/api/io")
def read_io():
    try:
        return jsonify(
            x=gateway.read_device_group("X"),
            y=gateway.read_device_group("Y"),
        )
    except Exception as error:
        return jsonify(error=str(error)), 500


@app.get("/api/read")
def read_x0():
    try:
        result, value = gateway.connect().GetDevice("X0")

        if result != 0:
            return jsonify(error=f"GetDevice failed with code {result}"), 502

        return jsonify(device="X0", value=int(value))
    except Exception as error:
        return jsonify(error=str(error)), 500


@app.post("/api/write")
def write_y():
    payload = request.get_json(silent=True) or {}
    device = payload.get("device")
    value = payload.get("value")

    if not isinstance(device, str) or not Y_DEVICE_PATTERN.fullmatch(device):
        return jsonify(error='device must be Y0 through Y7'), 400
    if type(value) is not int or value not in (0, 1):
        return jsonify(error="value must be 0 or 1"), 400

    try:
        result = gateway.connect().SetDevice(device, value)

        if result != 0:
            return jsonify(error=f"SetDevice failed with code {result}"), 502

        return jsonify(device=device, value=value, success=True)
    except Exception as error:
        return jsonify(error=str(error)), 500


if __name__ == "__main__":
    # ActUtlType is an apartment-threaded COM object. A single Flask worker keeps
    # every request on the same thread as the persistent MX Component connection.
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False,
        threaded=False,
    )
